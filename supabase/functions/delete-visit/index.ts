import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { authenticateRequest } from "../_shared/auth.ts";
import {
  errorResponse,
  jsonResponse,
  methodNotAllowed,
  optionsResponse,
} from "../_shared/http.ts";
import { serve } from "../_shared/runtime.ts";

const requestSchema = z.object({ visit_id: z.string().uuid() });

type PhotoRow = {
  storage_path: string;
};

class VisitDeletionService {
  public constructor(private readonly client: SupabaseClient) {}

  public async delete(visitId: string): Promise<string[]> {
    const { data, error } = await this.client
      .from("visit_photos")
      .select("storage_path")
      .eq("visit_id", visitId);
    if (error) {
      throw new Error(error.message);
    }
    const paths = (data as PhotoRow[]).map((photo) => photo.storage_path);
    const { error: deleteError } = await this.client.rpc("delete_visit_and_rescore", {
      p_visit_id: visitId,
    });
    if (deleteError) {
      throw new Error(deleteError.message);
    }
    if (paths.length > 0) {
      const { error: storageError } = await this.client.storage
        .from("visit-photos")
        .remove(paths);
      if (storageError) {
        throw new Error(
          `Visit deleted, but photo cleanup failed: ${storageError.message}`,
        );
      }
    }
    return paths;
  }
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return optionsResponse(request);
  }
  if (request.method !== "POST") {
    return methodNotAllowed(request);
  }

  try {
    const { userClient } = await authenticateRequest(request);
    const body = requestSchema.parse(await request.json());
    const deletedPhotos = await new VisitDeletionService(userClient).delete(
      body.visit_id,
    );
    return jsonResponse(request, {
      deleted: true,
      deleted_photo_count: deletedPhotos.length,
    });
  } catch (error) {
    return errorResponse(request, error);
  }
});
