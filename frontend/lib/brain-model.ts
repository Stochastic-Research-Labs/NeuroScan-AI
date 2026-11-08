/** glTF multi-material nodes store anatomical extras on a parent Group. */
type AnatomyNode = {
  userData: Record<string, unknown>;
  parent?: AnatomyNode | null;
};

export function getAnatomyCategory(node: AnatomyNode): string | undefined {
  let current: AnatomyNode | null | undefined = node;
  while (current) {
    const category = current.userData.bx_cat;
    if (typeof category === "string") return category;
    current = current.parent;
  }
  return undefined;
}
