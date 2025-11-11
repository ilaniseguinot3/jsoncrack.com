import type { NextApiRequest, NextApiResponse } from "next";

type ResponseData = {
  success: boolean;
  message?: string;
  error?: string;
};

/**
 * API endpoint to update a node in the document
 * POST /api/nodes/update
 * 
 * Expected body:
 * {
 *   documentId: string,
 *   nodePath: string[],  // e.g., ["customer", "name"]
 *   newValue: any,       // the new value for this node
 *   fullDocument: object // the updated full document
 * }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    console.log("Received request body:", req.body);
    
    const { documentId, nodePath, newValue, fullDocument } = req.body;

    if (!documentId || !nodePath || newValue === undefined || !fullDocument) {
      console.error("Missing required fields:", {
        hasDocumentId: !!documentId,
        hasNodePath: !!nodePath,
        hasNewValue: newValue !== undefined,
        hasFullDocument: !!fullDocument,
      });
      return res.status(400).json({
        success: false,
        error: "Missing required fields: documentId, nodePath, newValue, fullDocument",
      });
    }

    console.log("Node update received:", {
      documentId,
      nodePath: nodePath.join("."),
      newValue,
    });

    // TODO: Replace this with your actual database logic
    // For now, we just acknowledge the update in-memory
    // When you add MongoDB/database, store it here
    
    return res.status(200).json({
      success: true,
      message: `Node at path ${nodePath.join(".")} updated successfully`,
    });
  } catch (error) {
    console.error("Error updating node:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
