function processHierarchy(data, identity) {
  const invalidSet = new Set();
  const duplicateSet = new Set();

  const validPattern = /^[A-Z]->[A-Z]$/;

  const seenEdges = new Set();
  const childAssigned = new Map();
  const acceptedEdges = [];
  const allNodes = new Set();
  const nodeFirstSeenOrder = new Map();
  let seenCounter = 0;

  for (const rawEntry of Array.isArray(data) ? data : []) {
    const original = String(rawEntry ?? "");
    const entry = typeof rawEntry === "string" ? rawEntry.trim() : "";

    if (!entry || !validPattern.test(entry)) {
      invalidSet.add(original);
      continue;
    }

    const [parent, child] = entry.split("->");

    if (parent === child) {
      invalidSet.add(original);
      continue;
    }

    if (seenEdges.has(entry)) {
      duplicateSet.add(entry);
      continue;
    }
    seenEdges.add(entry);

    if (childAssigned.has(child)) {
      if (!nodeFirstSeenOrder.has(parent)) nodeFirstSeenOrder.set(parent, seenCounter++);
      if (!nodeFirstSeenOrder.has(child)) nodeFirstSeenOrder.set(child, seenCounter++);
      allNodes.add(parent);
      allNodes.add(child);
      continue;
    }

    childAssigned.set(child, parent);
    acceptedEdges.push([parent, child]);

    if (!nodeFirstSeenOrder.has(parent)) nodeFirstSeenOrder.set(parent, seenCounter++);
    if (!nodeFirstSeenOrder.has(child)) nodeFirstSeenOrder.set(child, seenCounter++);
    allNodes.add(parent);
    allNodes.add(child);
  }

  const childrenMap = new Map();
  const parentMap = new Map();

  for (const node of allNodes) {
    childrenMap.set(node, []);
  }

  for (const [parent, child] of acceptedEdges) {
    childrenMap.get(parent).push(child);
    parentMap.set(child, parent);
  }

  const undirected = new Map();
  for (const node of allNodes) {
    undirected.set(node, new Set());
  }

  for (const [parent, child] of acceptedEdges) {
    undirected.get(parent).add(child);
    undirected.get(child).add(parent);
  }

  const nodesInOrder = [...allNodes].sort(
    (a, b) => nodeFirstSeenOrder.get(a) - nodeFirstSeenOrder.get(b)
  );

  const visitedUndirected = new Set();
  const components = [];

  for (const node of nodesInOrder) {
    if (visitedUndirected.has(node)) continue;

    const queue = [node];
    visitedUndirected.add(node);
    const component = [];

    while (queue.length) {
      const curr = queue.shift();
      component.push(curr);

      const neighbors = [...(undirected.get(curr) || [])].sort(
        (a, b) => nodeFirstSeenOrder.get(a) - nodeFirstSeenOrder.get(b)
      );

      for (const next of neighbors) {
        if (!visitedUndirected.has(next)) {
          visitedUndirected.add(next);
          queue.push(next);
        }
      }
    }

    components.push(component);
  }

  function detectCycle(componentSet) {
    const visiting = new Set();
    const visited = new Set();

    function dfs(node) {
      if (visiting.has(node)) return true;
      if (visited.has(node)) return false;

      visiting.add(node);

      const children = [...(childrenMap.get(node) || [])].filter((child) =>
        componentSet.has(child)
      );

      for (const child of children) {
        if (dfs(child)) return true;
      }

      visiting.delete(node);
      visited.add(node);
      return false;
    }

    for (const node of componentSet) {
      if (!visited.has(node)) {
        if (dfs(node)) return true;
      }
    }

    return false;
  }

  function buildTree(node, componentSet) {
    const result = {};
    const children = [...(childrenMap.get(node) || [])]
      .filter((child) => componentSet.has(child))
      .sort((a, b) => nodeFirstSeenOrder.get(a) - nodeFirstSeenOrder.get(b));

    for (const child of children) {
      result[child] = buildTree(child, componentSet);
    }

    return result;
  }

  function computeDepth(node, componentSet) {
    const children = [...(childrenMap.get(node) || [])].filter((child) =>
      componentSet.has(child)
    );

    if (children.length === 0) return 1;

    let maxDepth = 0;
    for (const child of children) {
      maxDepth = Math.max(maxDepth, computeDepth(child, componentSet));
    }
    return 1 + maxDepth;
  }

  const hierarchies = [];
  let totalTrees = 0;
  let totalCycles = 0;
  let largestTreeRoot = "";
  let largestDepth = -1;

  for (const component of components) {
    const componentSet = new Set(component);

    const roots = component.filter((node) => !parentMap.has(node));
    const root =
      roots.length > 0
        ? [...roots].sort()[0]
        : [...component].sort()[0];

    const hasCycle = detectCycle(componentSet);

    if (hasCycle) {
      totalCycles++;
      hierarchies.push({
        root,
        tree: {},
        has_cycle: true
      });
      continue;
    }

    const tree = {
      [root]: buildTree(root, componentSet)
    };

    const depth = computeDepth(root, componentSet);

    totalTrees++;
    if (
      depth > largestDepth ||
      (depth === largestDepth && root.localeCompare(largestTreeRoot) < 0)
    ) {
      largestDepth = depth;
      largestTreeRoot = root;
    }

    hierarchies.push({
      root,
      tree,
      depth
    });
  }

  return {
    user_id: identity.user_id,
    email_id: identity.email_id,
    college_roll_number: identity.college_roll_number,
    hierarchies,
    invalid_entries: [...invalidSet],
    duplicate_edges: [...duplicateSet],
    summary: {
      total_trees: totalTrees,
      total_cycles: totalCycles,
      largest_tree_root: largestTreeRoot
    }
  };
}

module.exports = { processHierarchy };
