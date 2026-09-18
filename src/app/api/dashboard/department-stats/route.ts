import { prisma } from '@/lib/prisma';
import { ok } from '@/lib/http/responses';
import { withAuth } from '@/utils/apiWrapper';

export const GET = withAuth(async () => {
  const departments = await prisma.department.findMany({
    include: {
      head: { select: { id: true, name: true } },
      _count: { select: { employees: true, children: true } },
    },
    orderBy: { name: 'asc' },
  });

  return ok({
    departments: departments.map((d) => ({
      id: d.id,
      name: d.name,
      path: d.path,
      head: d.head,
      employeeCount: d._count.employees,
      childCount: d._count.children,
    })),
  });
}, ['ADMIN', 'HR_MANAGER']);
