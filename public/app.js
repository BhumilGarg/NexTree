function parseInput(text) {
  const trimmed = text.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((x) => String(x));
    }
  } catch (_) {}

  return trimmed
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function createPills(items) {
  if (!items.length) return "<p>None</p>";
  return `<div class="pill-list">${items
    .map((item) => `<span class="pill">${escapeHtml(item)}</span>`)
    .join("")}</div>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderTreeObject(obj) {
  return `<pre>${escapeHtml(JSON.stringify(obj, null, 2))}</pre>`;
}

function renderHierarchies(hierarchies) {
  if (!hierarchies.length) return "<p>No hierarchies found</p>";

  return hierarchies
    .map((item, index) => {
      const meta = item.has_cycle
        ? `Cycle detected`
        : `Depth: ${item.depth}`;

      return `
        <div class="tree-card">
          <h3 class="tree-title">Hierarchy ${index + 1} - Root: ${escapeHtml(item.root)}</h3>
          <div class="meta">${escapeHtml(meta)}</div>
          ${renderTreeObject(item.tree)}
        </div>
      `;
    })
    .join("");
}

document.getElementById("submitBtn").addEventListener("click", async () => {
  const errorBox = document.getElementById("errorBox");
  const resultSection = document.getElementById("resultSection");
  errorBox.classList.add("hidden");
  resultSection.classList.add("hidden");

  try {
    const apiBaseInput = document.getElementById("apiBase").value.trim();
    const nodeInput = document.getElementById("nodeInput").value;

    const data = parseInput(nodeInput);
    const endpoint = `${apiBaseInput || window.location.origin}/bfhl`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ data })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "API request failed");
    }

    document.getElementById("identity").innerHTML = `
      <p><strong>User ID:</strong> ${escapeHtml(result.user_id)}</p>
      <p><strong>Email:</strong> ${escapeHtml(result.email_id)}</p>
      <p><strong>Roll Number:</strong> ${escapeHtml(result.college_roll_number)}</p>
    `;

    document.getElementById("summary").innerHTML = `
      <p><strong>Total Trees:</strong> ${escapeHtml(result.summary.total_trees)}</p>
      <p><strong>Total Cycles:</strong> ${escapeHtml(result.summary.total_cycles)}</p>
      <p><strong>Largest Tree Root:</strong> ${escapeHtml(result.summary.largest_tree_root)}</p>
    `;

    document.getElementById("invalidEntries").innerHTML = createPills(result.invalid_entries || []);
    document.getElementById("duplicateEdges").innerHTML = createPills(result.duplicate_edges || []);
    document.getElementById("hierarchies").innerHTML = renderHierarchies(result.hierarchies || []);
    document.getElementById("rawResponse").textContent = JSON.stringify(result, null, 2);

    resultSection.classList.remove("hidden");
  } catch (error) {
    errorBox.textContent = error.message || "Something went wrong";
    errorBox.classList.remove("hidden");
  }
});
