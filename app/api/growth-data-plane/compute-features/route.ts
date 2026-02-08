/**
 * GDP-011: Person Features Computation
 * API endpoint to compute person features from events
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { z } from 'zod';

const requestSchema = z.object({
  person_id: z.string().uuid().optional(),
  cron_secret: z.string().optional(),
});

/**
 * Compute person features for a specific person or all persons
 * POST /api/growth-data-plane/compute-features
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { person_id, cron_secret } = requestSchema.parse(body);

    // Verify cron secret if provided (for scheduled jobs)
    const expectedSecret = process.env.CRON_SECRET;
    if (cron_secret && cron_secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Invalid cron secret' },
        { status: 401 }
      );
    }

    if (person_id) {
      // Compute features for specific person
      const { error } = await supabaseAdmin.rpc('compute_person_features', {
        p_person_id: person_id,
      });

      if (error) {
        console.error('[GDP-011] Error computing person features:', error);
        return NextResponse.json(
          { error: 'Failed to compute person features', details: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        person_id,
        message: 'Person features computed successfully',
      });
    } else {
      // Compute features for all persons
      // Get all person IDs
      const { data: persons, error: fetchError } = await supabaseAdmin
        .from('person')
        .select('id');

      if (fetchError) {
        console.error('[GDP-011] Error fetching persons:', fetchError);
        return NextResponse.json(
          { error: 'Failed to fetch persons' },
          { status: 500 }
        );
      }

      if (!persons || persons.length === 0) {
        return NextResponse.json({
          success: true,
          count: 0,
          message: 'No persons to compute features for',
        });
      }

      // Compute features for each person
      let successCount = 0;
      let errorCount = 0;

      for (const person of persons) {
        const { error } = await supabaseAdmin.rpc('compute_person_features', {
          p_person_id: person.id,
        });

        if (error) {
          console.error(`[GDP-011] Error computing features for person ${person.id}:`, error);
          errorCount++;
        } else {
          successCount++;
        }
      }

      return NextResponse.json({
        success: true,
        total: persons.length,
        successful: successCount,
        failed: errorCount,
        message: `Computed features for ${successCount} persons`,
      });
    }
  } catch (error) {
    console.error('[GDP-011] Error in compute-features endpoint:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
