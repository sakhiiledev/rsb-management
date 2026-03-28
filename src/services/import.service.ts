import { TRPCError } from "@trpc/server";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { auditService } from "./audit.service";
import { importQueue } from "@/server/jobs/queues";
import { AuditAction, ImportStatus, Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

interface PreviewInput {
  fileName: string;
  fileType: "xlsx" | "csv";
  fileContent: string; // base64
  resource: string;
}

export const importService = {
  async previewImport(input: PreviewInput, createdById: string) {
    const { fileName, fileType, fileContent, resource } = input;

    let rows: Record<string, unknown>[];
    try {
      rows = await parseFileContent(fileContent, fileType);
    } catch (err) {
      logger.error({ err, fileName }, "Failed to parse import file");
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Could not parse file. Please check the format.",
      });
    }

    const preview = rows.slice(0, 10);
    const errors = validateRows(rows, resource);

    const imp = await db.import.create({
      data: {
        fileName,
        fileType,
        status: errors.length > 0 ? ImportStatus.FAILED : ImportStatus.PENDING,
        rowCount: rows.length,
        errorCount: errors.length,
        errors: errors.length
          ? (errors as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        previewData: preview.length
          ? (preview as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        createdById,
      },
    });

    return { importId: imp.id, preview, rowCount: rows.length, errors };
  },

  async confirmImport(importId: string, actorId: string) {
    const imp = await db.import.findFirst({
      where: { id: importId, deletedAt: null },
    });

    if (!imp) throw new TRPCError({ code: "NOT_FOUND" });
    if (imp.errorCount && imp.errorCount > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot confirm an import with validation errors",
      });
    }

    // Enqueue the heavy import job
    const job = await importQueue.add(
      "process-import",
      { importId, actorId },
      { attempts: 3, backoff: { type: "exponential", delay: 2000 } }
    );

    const updated = await db.import.update({
      where: { id: importId },
      data: {
        status: ImportStatus.PROCESSING,
        jobId: job.id?.toString(),
      },
    });

    await auditService.log({
      action: AuditAction.IMPORT,
      resource: "Import",
      resourceId: importId,
      actorId,
      newValues: { status: ImportStatus.PROCESSING, jobId: job.id },
    });

    return updated;
  },

  async getImportById(id: string) {
    return db.import.findFirst({
      where: { id, deletedAt: null },
    });
  },

  async listImports({ page, limit }: { page: number; limit: number }) {
    const skip = (page - 1) * limit;
    const where: Prisma.ImportWhereInput = { deletedAt: null };

    const [imports, total] = await db.$transaction([
      db.import.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { createdBy: { select: { id: true, name: true, email: true } } },
      }),
      db.import.count({ where }),
    ]);

    return { imports, total, page, limit };
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function parseFileContent(
  base64Content: string,
  fileType: "xlsx" | "csv"
): Promise<Record<string, unknown>[]> {
  // Use any to avoid Buffer type incompatibility with older ExcelJS typings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer: any = Buffer.from(base64Content, "base64") as unknown;

  if (fileType === "csv") {
    const text = buffer.toString("utf-8");
    const result = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    return result.data;
  }

  // xlsx via ExcelJS
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const rows: Record<string, unknown>[] = [];
  const headerRow = sheet.getRow(1).values as (string | null)[];
  const headers = (Array.isArray(headerRow) ? headerRow : []).slice(1);

  sheet.eachRow((row, rowIndex) => {
    if (rowIndex === 1) return;
    const values = row.values as unknown[];
    const obj: Record<string, unknown> = {};
    headers.forEach((header, idx) => {
      if (header) obj[header] = values[idx + 1] ?? null;
    });
    rows.push(obj);
  });

  return rows;
}

function validateRows(
  rows: Record<string, unknown>[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _resource: string
): Array<{ row: number; field: string; message: string }> {
  const errors: Array<{ row: number; field: string; message: string }> = [];
  rows.forEach((row, idx) => {
    const isEmpty = Object.values(row).every(
      (v) => v === null || v === undefined || v === ""
    );
    if (isEmpty) {
      errors.push({ row: idx + 2, field: "*", message: "Row is empty" });
    }
  });
  return errors;
}
