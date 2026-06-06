import { NotFoundError } from '../../common/errors/index.js';
import {
  findKnowledgeBasesByOrg,
  findKnowledgeBaseByIdAndOrg,
  createKnowledgeBase,
} from './knowledge-base.repository.js';

export interface KnowledgeBaseView {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function toView(kb: {
  id: string; organizationId: string; name: string;
  description: string | null; createdAt: Date; updatedAt: Date;
}): KnowledgeBaseView {
  return {
    id: kb.id, organizationId: kb.organizationId, name: kb.name,
    description: kb.description, createdAt: kb.createdAt, updatedAt: kb.updatedAt,
  };
}

export async function createKB(
  name: string,
  organizationId: string,
  description?: string,
): Promise<KnowledgeBaseView> {
  const kb = await createKnowledgeBase({ organizationId, name, description });
  return toView(kb);
}

export async function listKBs(organizationId: string): Promise<KnowledgeBaseView[]> {
  const kbs = await findKnowledgeBasesByOrg(organizationId);
  return kbs.map(toView);
}

export async function getKB(
  id: string,
  organizationId: string,
): Promise<KnowledgeBaseView> {
  const kb = await findKnowledgeBaseByIdAndOrg(id, organizationId);
  if (!kb) throw new NotFoundError('KnowledgeBase');
  return toView(kb);
}
