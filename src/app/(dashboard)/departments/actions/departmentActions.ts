// src/app/(dashboard)/departments/actions.ts
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createDepartmentAction(input: {
  name: string;
  description: string | null;
  parentId: string | null;
}) {
  const dept = await prisma.department.create({
    data: {
      name: input.name,
      description: input.description,
      parentId: input.parentId,
    },
  });
  revalidatePath('/departments');
  return dept;
}

export async function updateDepartment(id: string, input: {
  name: string;
  description: string | null;
}) {
  const dept = await prisma.department.update({
    where: { id },
    data: { name: input.name, description: input.description },
  });
  revalidatePath('/departments');
  return dept;
}