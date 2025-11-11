import React, { useState } from "react";
import type { ModalProps } from "@mantine/core";
import { Modal, Stack, Text, ScrollArea, Flex, CloseButton, Button, Textarea, Group } from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import toast from "react-hot-toast";
import type { NodeData } from "../../../types/graph";
import useGraph from "../../editor/views/GraphView/stores/useGraph";
import useFile from "../../../store/useFile";

// return object from json removing array and object fields
const normalizeNodeData = (nodeRows: NodeData["text"]) => {
  if (!nodeRows || nodeRows.length === 0) return "{}";
  if (nodeRows.length === 1 && !nodeRows[0].key) return `${nodeRows[0].value}`;

  const obj = {};
  nodeRows?.forEach(row => {
    if (row.type !== "array" && row.type !== "object") {
      if (row.key) obj[row.key] = row.value;
    }
  });
  return JSON.stringify(obj, null, 2);
};

// return json path in the format $["customer"]
const jsonPathToString = (path?: NodeData["path"]) => {
  if (!path || path.length === 0) return "$";
  const segments = path.map(seg => (typeof seg === "number" ? seg : `"${seg}"`));
  return `$[${segments.join("][")}]`;
};

export const NodeModal = ({ opened, onClose }: ModalProps) => {
  const nodeData = useGraph(state => state.selectedNode);
  const getContents = useFile(state => state.getContents);
  const setContents = useFile(state => state.setContents);
  const fileData = useFile(state => state.fileData);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(normalizeNodeData(nodeData?.text ?? []));
  const [isSaving, setIsSaving] = useState(false);

  const handleEditClick = () => {
    setIsEditing(true);
    setEditValue(normalizeNodeData(nodeData?.text ?? []));
  };

  const handleSave = async () => {
    if (!nodeData) return;

    setIsSaving(true);
    try {
      // Parse the edited JSON
      const newNodeValue = JSON.parse(editValue);
      
      // Get the full document
      const fullDocument = JSON.parse(getContents());
      
      // Update the value at the node's path
      if (nodeData.path && nodeData.path.length > 0) {
        let current = fullDocument;
        for (let i = 0; i < nodeData.path.length - 1; i++) {
          current = current[nodeData.path[i]];
        }
        const lastKey = nodeData.path[nodeData.path.length - 1];
        current[lastKey] = newNodeValue;
      } else {
        // If no path, replace entire document
        return Object.assign(fullDocument, newNodeValue);
      }

      // Call the API to persist to database
      const response = await fetch("/api/nodes/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: fileData?.id || "current-doc", // Uses actual document ID from store
          nodePath: nodeData.path || [],
          newValue: newNodeValue,
          fullDocument,
        }),
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response received:", text);
        throw new Error(`API returned non-JSON response. Status: ${response.status}`);
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update node");
      }

      const result = await response.json();
      console.log("Save successful:", result);

      // Update the app state with new document
      setContents({ contents: JSON.stringify(fullDocument, null, 2), hasChanges: true });
      toast.success("Node updated successfully!");
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving node:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save node");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };


  return (
    <Modal size="auto" opened={opened} onClose={onClose} centered withCloseButton={false}>
      <Stack pb="sm" gap="sm">
        <Stack gap="xs">
          <Flex justify="space-between" align="center">
            <Text fz="xs" fw={500}>
              Content
            </Text>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              {isEditing ? (
                <>
                  <Button size="xs" variant="default" onClick={handleCancel} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button size="xs" onClick={handleSave} loading={isSaving}>
                    Save
                  </Button>
                </>
              ) : (
                <Button size="xs" variant="light" onClick={handleEditClick}>
                  Edit
                </Button>
              )}
              <CloseButton onClick={onClose} />
            </div>
          </Flex>
          <ScrollArea.Autosize mah={250} maw={600}>
            {isEditing ? (
              <Textarea
                value={editValue}
                onChange={(e) => setEditValue(e.currentTarget.value)}
                placeholder="Edit JSON content..."
                minRows={6}
                styles={{ input: { fontFamily: "monospace", fontSize: "12px" } }}
              />
            ) : (
              <CodeHighlight
                code={normalizeNodeData(nodeData?.text ?? [])}
                miw={350}
                maw={600}
                language="json"
                withCopyButton
              />
            )}
          </ScrollArea.Autosize>
        </Stack>
        <Text fz="xs" fw={500}>
          JSON Path
        </Text>
        <ScrollArea.Autosize maw={600}>
          <CodeHighlight
            code={jsonPathToString(nodeData?.path)}
            miw={350}
            mah={250}
            language="json"
            copyLabel="Copy to clipboard"
            copiedLabel="Copied to clipboard"
            withCopyButton
          />
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  );
};
