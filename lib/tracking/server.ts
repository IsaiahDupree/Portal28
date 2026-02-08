/**
 * Server-side tracking utilities for Portal28
 *
 * Use this for tracking events from API routes and server components.
 */

import { createServerClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

interface TrackingEvent {
  event: string;
  properties?: Record<string, any>;
  userId?: string;
  timestamp?: string;
}

/**
 * Track an event from the server
 *
 * @param event Event name
 * @param properties Event properties
 * @param userId Optional user ID (will be inferred from session if not provided)
 */
export async function trackServerEvent(
  event: string,
  properties?: Record<string, any>,
  userId?: string
): Promise<void> {
  try {
    const supabase = await createServerClient();

    // Get user from session if not provided
    let finalUserId = userId;
    if (!finalUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      finalUserId = user?.id;
    }

    // Insert event into database
    const { error } = await supabase.from('tracking_events').insert({
      event_name: event,
      user_id: finalUserId || null,
      properties: properties || {},
      timestamp: new Date().toISOString(),
    });

    if (error) {
      logger.error('Failed to track server event', error, { event, userId: finalUserId });
    }
  } catch (error) {
    // Tracking failures should not break the application
    logger.error('Error tracking server event', error as Error, { event });
  }
}

/**
 * Track product download events
 */
export async function trackProductDownload(params: {
  productId: string;
  productType: string;
  fileName?: string;
  fileSize?: number;
  userId?: string;
}): Promise<void> {
  await trackServerEvent('product_downloaded', {
    product_id: params.productId,
    product_type: params.productType,
    file_name: params.fileName,
    file_size: params.fileSize,
  }, params.userId);
}

/**
 * Track template download
 */
export async function trackTemplateDownload(params: {
  templateId: string;
  fileName: string;
  userId?: string;
}): Promise<void> {
  await trackServerEvent('template_downloaded', {
    template_id: params.templateId,
    file_name: params.fileName,
  }, params.userId);
}

/**
 * Track resource download
 */
export async function trackResourceDownload(params: {
  resourceId: string;
  fileName: string;
  fileSize?: number;
  userId?: string;
}): Promise<void> {
  await trackServerEvent('resource_downloaded', {
    resource_id: params.resourceId,
    file_name: params.fileName,
    file_size: params.fileSize,
  }, params.userId);
}

/**
 * Track certificate download
 */
export async function trackCertificateDownload(params: {
  certificateId: string;
  courseId?: string;
  userId?: string;
}): Promise<void> {
  await trackServerEvent('certificate_downloaded', {
    certificate_id: params.certificateId,
    course_id: params.courseId,
  }, params.userId);
}

/**
 * Track product creation
 */
export async function trackProductCreated(params: {
  productId: string;
  productType: string;
  title: string;
  category?: string;
  userId?: string;
}): Promise<void> {
  await trackServerEvent('product_created', {
    product_id: params.productId,
    product_type: params.productType,
    title: params.title,
    category: params.category,
  }, params.userId);
}

/**
 * Track product completion
 */
export async function trackProductCompleted(params: {
  productId: string;
  productType: string;
  userId?: string;
}): Promise<void> {
  await trackServerEvent('product_completed', {
    product_id: params.productId,
    product_type: params.productType,
  }, params.userId);
}
