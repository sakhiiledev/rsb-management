/**
 * Prisma seed script — creates initial admin user and default permissions.
 * Run: npx tsx prisma/seed.ts
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole, AuditAction } from "@prisma/client";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/rsb_management",
});
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

const DEFAULT_PERMISSIONS = [
  { resource: "users", action: "read" },
  { resource: "users", action: "write" },
  { resource: "users", action: "delete" },
  { resource: "reports", action: "read" },
  { resource: "reports", action: "export" },
  { resource: "imports", action: "create" },
  { resource: "imports", action: "read" },
  { resource: "audit", action: "read" },
  { resource: "settings", action: "read" },
  { resource: "settings", action: "write" },
];

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: DEFAULT_PERMISSIONS.map((p) => `${p.resource}:${p.action}`),
  MANAGER: [
    "users:read",
    "reports:read",
    "reports:export",
    "imports:create",
    "imports:read",
    "audit:read",
    "settings:read",
  ],
  MEMBER: ["users:read", "reports:read", "imports:create", "imports:read"],
};

async function main() {
  console.log("🌱 Seeding database...");

  // Create permissions
  for (const p of DEFAULT_PERMISSIONS) {
    await db.permission.upsert({
      where: { name: `${p.resource}:${p.action}` },
      create: {
        name: `${p.resource}:${p.action}`,
        resource: p.resource,
        action: p.action,
        description: `${p.action} on ${p.resource}`,
      },
      update: {},
    });
  }
  console.log(`✅ Created ${DEFAULT_PERMISSIONS.length} permissions`);

  // Assign permissions to roles
  for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) {
    for (const perm of perms) {
      const permission = await db.permission.findUnique({
        where: { name: perm },
      });
      if (!permission) continue;

      await db.rolePermission.upsert({
        where: {
          role_permissionId: {
            role: role as UserRole,
            permissionId: permission.id,
          },
        },
        create: {
          role: role as UserRole,
          permissionId: permission.id,
        },
        update: {},
      });
    }
  }
  console.log("✅ Assigned role permissions");

  // Create default admin user
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@rsb.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin@123456";

  const existingAdmin = await db.user.findFirst({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const admin = await db.user.create({
      data: {
        email: adminEmail,
        name: "System Admin",
        role: UserRole.ADMIN,
        passwordHash,
        isActive: true,
      },
    });

    // Log the creation in the audit log
    await db.auditLog.create({
      data: {
        action: AuditAction.CREATE,
        resource: "User",
        resourceId: admin.id,
        actorId: admin.id,
        newValues: { email: admin.email, role: admin.role },
        createdBy: admin.id,
      },
    });

    console.log(`✅ Created admin user: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log("   ⚠️  Change the admin password immediately after first login!");
  } else {
    console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
  }

  console.log("🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
