import { prisma } from '@/lib/prisma';
import { ok } from '@/lib/http/responses';
import { withAuth } from '@/utils/apiWrapper';

type TreeNode = {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  headId: string | null;
  path: string | null;
  children: TreeNode[];
};

export const GET = withAuth(async () => {
  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
  });

  const nodes = new Map<string, TreeNode>(
    departments.map((d) => [
      d.id,
      {
        id: d.id,
        name: d.name,
        description: d.description,
        parentId: d.parentId,
        headId: d.headId,
        path: d.path,
        children: [],
      },
    ])
  );

  const roots: TreeNode[] = [];
  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return ok({ tree: roots });
});
