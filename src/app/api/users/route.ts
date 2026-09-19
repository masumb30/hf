import bcrypt from 'bcrypt';
import { prisma, Prisma } from '@/lib/prisma';
import { writeAudit } from '@/lib/audit';
import { withTx } from '@/lib/db/transaction';
import { ok, created, fail } from '@/lib/http/responses';
import { userPublicSelect } from '@/lib/permissions';
import {
  createUserSchema,
  updateUserSchema,
  userListQuerySchema,
} from '@/lib/validation/user.schema';
import { parseJson, parseSearchParams } from '@/lib/validation/common';
import { withAuth, readBody, paramId } from '@/utils/apiWrapper';

// export const GET = withAuth(async (req, _context, _user) => {
//   const parsed = parseSearchParams(userListQuerySchema, new URL(req.url).searchParams);
//   if (!parsed.success) return fail(parsed.message);

//   const { q, role, dept, status, skip, take } = parsed.data;
//   const where: Prisma.UserWhereInput = {
//     deletedAt: null,
//     ...(role ? { role } : {}),
//     ...(dept ? { departmentId: dept } : {}),
//     ...(status ? { status } : {}),
//     ...(q
//       ? {
//           OR: [
//             { name: { contains: q } },
//             { email: { contains: q } },
//             { position: { contains: q } },
//           ],
//         }
//       : {}),
//   };

//   const [users, total] = await Promise.all([
//     prisma.user.findMany({
//       where,
//       select: userPublicSelect,
//       skip,
//       take,
//       orderBy: { createdAt: 'desc' },
//     }),
//     prisma.user.count({ where }),
//   ]);

//   return ok({ users, total });
// }, ['ADMIN', 'HR_MANAGER']);
type Role = 'ADMIN' | 'HR_MANAGER' | 'EMPLOYEE'
type EmploymentStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED'

export const GET = withAuth(async (req, _context, _user) => {
  console.log('reached fetching users')
  const sp = new URL(req.url).searchParams;

  const q = sp.get('name')?.trim() || undefined;
  const role = sp.get('role') || undefined;
  const status = sp.get('status') || undefined;
  const dept = sp.get('dept') || undefined;

  const skip = Math.max(0, Number(sp.get('skip') ?? 0) || 0);
  const take = Math.min(100, Math.max(1, Number(sp.get('take') ?? 20) || 20));

  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(role ? { role: role as Role } : {}),
    ...(status ? { status: status as EmploymentStatus } : {}),
    ...(dept ? { departmentId: dept } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { position: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userPublicSelect,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  return ok({ users, total });
}, ['ADMIN', 'HR_MANAGER']);


export const POST = withAuth(async (req, _context, actor) => {
  const parsed = parseJson(createUserSchema, await readBody(req));
  if (!parsed.success) return fail(parsed.message);

  const body = parsed.data;
  if (actor.role === 'HR_MANAGER' && body.role && body.role !== 'EMPLOYEE') {
    return fail('HR managers can only create employees', 403);
  }

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) return fail('User with this email already exists');

  if (body.departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: body.departmentId } });
    if (!dept) return fail('Department not found', 404);
  }

  const hashedPassword = await bcrypt.hash(body.password, 10);
  const user = await withTx(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashedPassword,
        phone: body.phone,
        position: body.position,
        role: body.role ?? 'EMPLOYEE',
        departmentId: body.departmentId,
      },
      select: userPublicSelect,
    });
    await writeAudit(tx, {
      actorId: actor.id,
      action: 'EMPLOYEE_CREATED',
      entityType: 'User',
      entityId: createdUser.id,
      metadata: { email: createdUser.email, role: createdUser.role },
    });
    return createdUser;
  });

  return created(user, 'User created successfully');
}, ['ADMIN', 'HR_MANAGER']);
