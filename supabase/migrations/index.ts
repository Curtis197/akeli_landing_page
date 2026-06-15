// ============================================================
// Edge Function: validate-ingredient
// Called by admin to validate an ingredient_submission
//
// What it does:
//   1. Validates the submission (status → 'validated')
//   2. If submission has image_url: copies image from pending → public bucket
//   3. Calls create_ingredient_image() to persist the image record
//   4. Deletes the pending image from the private bucket
//
// POST /functions/v1/validate-ingredient
// Body: { submission_id: string }
// Auth: service_role only
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const PENDING_BUCKET = 'ingredient-images-pending'
const PUBLIC_BUCKET  = 'ingredient-images'

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )

  try {
    const { submission_id } = await req.json()

    if (!submission_id) {
      return json({ error: 'submission_id is required' }, 400)
    }

    // Step 1: Fetch submission
    const { data: submission, error: fetchError } = await supabase
      .from('ingredient_submission')
      .select('*, ingredient_id, image_url, submitted_by')
      .eq('id', submission_id)
      .single()

    if (fetchError || !submission) {
      return json({ error: 'Submission not found' }, 404)
    }

    if (submission.status === 'validated') {
      return json({ error: 'Already validated' }, 409)
    }

    if (!submission.ingredient_id) {
      return json({ error: 'No ingredient linked to this submission. Create the ingredient first.' }, 422)
    }

    // Step 2: Handle image if present
    if (submission.image_url) {
      const pendingPath = submission.image_url // e.g. {submission_id}/cover.jpg
      const filename    = pendingPath.split('/').pop() ?? 'cover.jpg'
      const publicPath  = `${submission.ingredient_id}/${filename}`

      // 2a. Download from pending bucket
      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from(PENDING_BUCKET)
        .download(pendingPath)

      if (downloadError || !fileData) {
        console.error('Failed to download pending image:', downloadError)
        // Non-blocking: continue validation without image
      } else {
        // 2b. Upload to public bucket
        const { error: uploadError } = await supabase
          .storage
          .from(PUBLIC_BUCKET)
          .upload(publicPath, fileData, {
            upsert: true,
            contentType: fileData.type,
          })

        if (uploadError) {
          console.error('Failed to upload to public bucket:', uploadError)
        } else {
          // 2c. Get public URL
          const { data: urlData } = supabase
            .storage
            .from(PUBLIC_BUCKET)
            .getPublicUrl(publicPath)

          // 2d. Create ingredient_image record
          const { error: imageError } = await supabase.rpc('create_ingredient_image', {
            p_ingredient_id : submission.ingredient_id,
            p_submission_id : submission_id,
            p_storage_path  : publicPath,
            p_url           : urlData.publicUrl,
            p_uploaded_by   : submission.submitted_by ?? null,
          })

          if (imageError) {
            console.error('Failed to create ingredient_image record:', imageError)
          }

          // 2e. Delete from pending bucket
          await supabase
            .storage
            .from(PENDING_BUCKET)
            .remove([pendingPath])
        }
      }
    }

    // Step 3: Mark submission as validated
    const { error: updateError } = await supabase
      .from('ingredient_submission')
      .update({
        status      : 'validated',
        reviewed_at : new Date().toISOString(),
      })
      .eq('id', submission_id)

    if (updateError) {
      return json({ error: updateError.message }, 500)
    }

    return json({
      message       : 'Ingredient validated successfully',
      ingredient_id : submission.ingredient_id,
      image_copied  : !!submission.image_url,
    })

  } catch (err) {
    console.error('Unexpected error:', err)
    return json({ error: String(err) }, 500)
  }
})

// ——— Helper
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
