import { prisma } from '@/lib/prisma';
import { ok } from '@/lib/http/responses';
import { withAuth } from '@/utils/apiWrapper';

export const GET = withAuth(async () => {
  const [byRole, byDepartment] = await Promise.all([
    prisma.user.groupBy({
      by: ['role'],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.user.groupBy({
      by: ['departmentId'],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
  ]);

  const departments = await prisma.department.findMany({
    select: { id: true, name: true },
  });
  const deptNames = new Map(departments.map((d) => [d.id, d.name]));

  return ok({
    byRole: byRole.map((row) => ({ role: row.role, count: row._count._all })),
    byDepartment: byDepartment.map((row) => ({
      departmentId: row.departmentId,
      departmentName: row.departmentId ? deptNames.get(row.departmentId) ?? null : 'Unassigned',
      count: row._count._all,
    })),
  });
}, ['ADMIN', 'HR_MANAGER']);
