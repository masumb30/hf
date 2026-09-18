import type { Prisma } from '@/lib/prisma';
import type { AuthUser } from '@/utils/apiWrapper';
import { prisma } from '@/lib/prisma';

export const userPublicSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  position: true,
  role: true,
  status: true,
  dateJoined: true,
  profileImage: true,
  departmentId: true,
  deactivatedAt: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type ReviewableUser = {
  id: string;
  role: string;
  status: string;
};

export function canReviewLeave(actor: AuthUser, target: ReviewableUser) {
  if (actor.id === target.id) return false;
  if (target.status !== 'ACTIVE') return false;
  if (target.role === 'EMPLOYEE') {
    return actor.role === 'ADMIN' || actor.role === 'HR_MANAGER';
  }
  if (target.role === 'HR_MANAGER') {
    return actor.role === 'ADMIN';
  }
  if (target.role === 'ADMIN') {
    return actor.role === 'ADMIN' && actor.id !== target.id;
  }
  return false;
}

export function isHrOrAdmin(role: string) {
  return role === 'ADMIN' || role === 'HR_MANAGER';
}

export function isDeptHead(
  actor: { id: string },
  department: { headId: string | null }
) {
  return department.headId === actor.id;
}

export async function isHeadOfDepartment(actorId: string, departmentId: string) {
  const dept = await prisma.department.findUnique({
    where: { id: departmentId },
    select: { headId: true },
  });
  return Boolean(dept && dept.headId === actorId);
}

export function wouldCreateCycle(
  departmentId: string,
  newParentId: string | null,
  descendantIds: string[]
) {
  if (!newParentId) return false;
  if (newParentId === departmentId) return true;
  return descendantIds.includes(newParentId);
}

export type ConversationWithParticipants = {
  type: string;
  dedupeKey: string | null;
  participants: {
    userId: string | null;
    departmentId: string | null;
    isActive: boolean;
  }[];
};

export async function canViewConversation(
  actor: AuthUser,
  conversation: ConversationWithParticipants
) {
  const activeUserParticipant = conversation.participants.some(
    (p) => p.isActive && p.userId === actor.id
  );
  if (conversation.type === 'DIRECT') {
    return activeUserParticipant;
  }

  if (activeUserParticipant) return true;

  const participatingDeptIds = conversation.participants
    .filter((p) => p.isActive && p.departmentId)
    .map((p) => p.departmentId as string);

  if (participatingDeptIds.length === 0) return false;

  if (actor.departmentId && participatingDeptIds.includes(actor.departmentId)) {
    return true;
  }

  if (!actor.departmentId) return false;

  const actorDept = await prisma.department.findUnique({
    where: { id: actor.departmentId },
    select: { path: true },
  });
  if (!actorDept?.path) return false;

  const participatingDepts = await prisma.department.findMany({
    where: { id: { in: participatingDeptIds } },
    select: { path: true },
  });

  return participatingDepts.some(
    (d) => d.path && d.path.startsWith(`${actorDept.path}/`)
  );
}

export async function requireConversationAccess(
  actor: AuthUser,
  conversationId: string
) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: {
        select: { userId: true, departmentId: true, isActive: true },
      },
    },
  });
  if (!conversation) return { conversation: null, allowed: false };
  const allowed = await canViewConversation(actor, conversation);
  return { conversation, allowed };
}

export function directDedupeKey(userIdA: string, userIdB: string) {
  return [userIdA, userIdB].sort().join(':');
}

export function utcDay(input?: string | Date) {
  const d = input ? new Date(input) : new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function departmentPath(parentPath: string | null | undefined, id: string) {
  return parentPath ? `${parentPath}/${id}` : `/${id}`;
}

export async function getDescendantDepartments(departmentId: string, path?: string | null) {
  let currentPath = path;
  if (currentPath === undefined) {
    const dept = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { path: true },
    });
    currentPath = dept?.path ?? null;
  }
  if (!currentPath) return [];
  return prisma.department.findMany({
    where: { path: { startsWith: `${currentPath}/` } },
  });
}
