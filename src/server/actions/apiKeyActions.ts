'use server';

import { connectToDatabase } from '../database/mongodb';
import { getTenantContext } from '../permissions/tenant';
import ApiKey from '@/models/ApiKey';
import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';
import crypto from 'crypto';

interface CreateApiKeyParams {
  name: string;
  scopes?: string[];
}

export async function generateApiKeyAction(params: CreateApiKeyParams) {
  try {
    const context = await getTenantContext();
    const organizationId = context.organizationId;

    if (!organizationId) {
      return { success: false, error: 'No se encuentra en un contexto de organización activo' };
    }

    if (!params.name) {
      return { success: false, error: 'El nombre es obligatorio para identificar la clave' };
    }

    await connectToDatabase();

    // 1. Generate secure raw API key: cre_live_ + 24 bytes in hex
    const rawKey = `cre_live_${crypto.randomBytes(24).toString('hex')}`;

    // 2. Generate secure preview string: cre_live_xxxx...xxxx
    const keyPreview = `${rawKey.substring(0, 13)}...${rawKey.substring(rawKey.length - 4)}`;

    // 3. Generate SHA-256 key hash for database search and secure matching
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    // 4. Save to MongoDB
    const apiKey = new ApiKey({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      name: params.name.trim(),
      keyHash,
      keyPreview,
      scopes: params.scopes || ['read', 'write'],
      isRevoked: false,
    });

    await apiKey.save();

    revalidatePath('/dashboard/settings');
    
    // Return original raw API key only once!
    return { success: true, originalKey: rawKey };
  } catch (error: any) {
    console.error('Error generating API key:', error);
    return { success: false, error: error.message || 'Error inesperado al generar clave' };
  }
}

export async function revokeApiKeyAction(keyId: string) {
  try {
    const context = await getTenantContext();
    const organizationId = context.organizationId;

    if (!organizationId) {
      return { success: false, error: 'No autorizado' };
    }

    await connectToDatabase();

    const apiKey = await ApiKey.findOne({
      _id: new mongoose.Types.ObjectId(keyId),
      organizationId: new mongoose.Types.ObjectId(organizationId),
    });

    if (!apiKey) {
      return { success: false, error: 'Clave de API no encontrada' };
    }

    apiKey.isRevoked = true;
    await apiKey.save();

    revalidatePath('/dashboard/settings');
    return { success: true };
  } catch (error: any) {
    console.error('Error revoking API key:', error);
    return { success: false, error: error.message || 'Error al revocar clave' };
  }
}

export async function getApiKeysAction() {
  try {
    const context = await getTenantContext();
    const organizationId = context.organizationId;

    if (!organizationId) return [];

    await connectToDatabase();

    const keys = await ApiKey.find({
      organizationId: new mongoose.Types.ObjectId(organizationId),
    }).sort({ createdAt: -1 });

    return JSON.parse(JSON.stringify(keys));
  } catch (err) {
    console.error('Error getting API keys:', err);
    return [];
  }
}
