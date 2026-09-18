'use client';

import Link from 'next/link';
import { useState } from 'react';
import DepartmentForm from './DepartmentForm';
import DepartmentActions from './DepartmentActions';

interface DeptBase {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  headId: string | null;
  path: string | null;
  head: { id: string; name: string; email: string } | null;
  _count: { employees: number; children: number };
}

export interface DeptNode extends DeptBase {
  children: DeptNode[];
}

interface UserOption {
  id: string;
  name: string;
  email: string;
}

interface Props {
  tree: DeptNode[];
  flat: DeptBase[];
  users: UserOption[];
  canManage: boolean;
}

export default function DepartmentTree({ tree, flat, users, canManage }: Props) {
  const [createOpen, setCreateOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);

  function openCreate(parentId: string | null) {
    setCreateParentId(parentId);
    setCreateOpen(true);
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button
            onClick={() => openCreate(null)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New department
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {tree.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              No departments yet
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {canManage ? 'Create your first department to get started.' : 'Check back later.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {tree.map((node) => (
              <TreeRow
                key={node.id}
                node={node}
                depth={0}
                flat={flat}
                users={users}
                canManage={canManage}
                onCreateChild={openCreate}
              />
            ))}
          </ul>
        )}
      </div>

      {createOpen && (
        <DepartmentForm
          mode="create"
          flat={flat}
          initialParentId={createParentId}
          onClose={() => setCreateOpen(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// TreeRow — one department node + its children (recursive)
// ---------------------------------------------------------------------

function TreeRow({
  node,
  depth,
  flat,
  users,
  canManage,
  onCreateChild,
}: {
  node: DeptNode;
  depth: number;
  flat: DeptBase[];
  users: UserOption[];
  canManage: boolean;
  onCreateChild: (parentId: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  const hasChildren = node.children.length > 0;
  const indent = depth * 20;

  return (
    <li>
      <div
        className="group flex items-center gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
        style={{ paddingLeft: `${indent + 8}px` }}
      >
        {/* Expand/collapse */}
        {hasChildren ? (
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700"
          >
            <svg
              className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <span className="h-5 w-5 flex-shrink-0" />
        )}

        {/* Name + meta */}
        <Link
          href={`/departments/${node.id}`}
          className="flex min-w-0 flex-1 items-center gap-2"
        >
          <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
            {node.name}
          </span>
          {node.head && (
            <span className="hidden truncate rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 sm:inline dark:bg-indigo-950/50 dark:text-indigo-300">
              Head: {node.head.name}
            </span>
          )}
          <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 sm:inline dark:bg-slate-800 dark:text-slate-400">
            {node._count.employees} {node._count.employees === 1 ? 'member' : 'members'}
          </span>
        </Link>

        {/* Actions */}
        {canManage && (
          <div className="relative flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <button
              onClick={() => onCreateChild(node.id)}
              aria-label="Add sub-department"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800"
              title="Add sub-department"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={() => setEditOpen(true)}
              aria-label="Edit department"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              title="Edit"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => setActionsOpen(true)}
              aria-label="More actions"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              title="More actions"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <ul className="space-y-0.5">
          {node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              flat={flat}
              users={users}
              canManage={canManage}
              onCreateChild={onCreateChild}
            />
          ))}
        </ul>
      )}

      {/* Edit dialog */}
      {editOpen && (
        <DepartmentForm
          mode="edit"
          flat={flat}
          initial={{
            id: node.id,
            name: node.name,
            description: node.description,
            parentId: node.parentId,
          }}
          onClose={() => setEditOpen(false)}
        />
      )}

      {/* Actions dialog */}
      {actionsOpen && (
        <DepartmentActions
          department={{
            id: node.id,
            name: node.name,
            parentId: node.parentId,
            headId: node.headId,
            head: node.head,
          }}
          flat={flat}
          users={users}
          onClose={() => setActionsOpen(false)}
        />
      )}
    </li>
  );
}