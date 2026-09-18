import { redirect } from 'next/navigation';
import ActivityFilters from './_components/ActivityFilters';
import ActivityTable from './_components/ActivityTable';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';

interface PageProps {
  searchParams: Promise<{
    action?: string;
    entityType?: string;
    actorId?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 30;

export default async function ActivityPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const role = session.role as string;
  if (role !== 'ADMIN') redirect('/dashboard');

  const params = await searchParams;
  const actionFilter = params.action ?? '';
  const entityFilter = params.entityType ?? '';
  const actorFilter = params.actorId ?? '';
  const page = Math.max(parseInt(params.page ?? '1', 10) || 1, 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where: Record<string, unknown> = {};
  if (actionFilter) where.action = actionFilter;
  if (entityFilter) where.entityType = entityFilter;
  if (actorFilter) where.actorId = actorFilter;

  const [logs, total, actors, distinctActions, distinctEntities] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      include: {
        actor: {
          select: { id: true, name: true, email: true, profileImage: true, role: true },
        },
      },
    }),
    prisma.auditLog.count({ where }),
    prisma.user.findMany({
      where: {
        auditLogs: { some: {} },
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
    prisma.auditLog.findMany({
      select: { action: true },
      distinct: ['action'],
      orderBy: { action: 'asc' },
    }),
    prisma.auditLog.findMany({
      select: { entityType: true },
      distinct: ['entityType'],
      orderBy: { entityType: 'asc' },
    }),
  ]);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Activity logs
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {total} {total === 1 ? 'entry' : 'entries'} recorded.
          </p>
        </div>
      </header>

      <ActivityFilters
        initial={{
          action: actionFilter,
          entityType: entityFilter,
          actorId: actorFilter,
        }}
        actors={actors}
        actions={distinctActions.map((a) => a.action)}
        entities={distinctEntities.map((e) => e.entityType)}
      />

      <ActivityTable
        logs={logs.map((l) => ({
          id: l.id,
          action: l.action,
          entityType: l.entityType,
          entityId: l.entityId,
          metadata: l.metadata as Record<string, unknown> | null,
          createdAt: l.createdAt.toISOString(),
          actor: l.actor
            ? {
                id: l.actor.id,
                name: l.actor.name,
                email: l.actor.email,
                profileImage: l.actor.profileImage,
                role: l.actor.role,
              }
            : null,
        }))}
        pagination={{ page, totalPages, total }}
      />
    </div>
  );
}