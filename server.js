const express = require("express");
const cors = require("cors");
const path = require("path");
const { processHierarchy } = require("./logic");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const identity = {
  user_id: "BhumilGarg",
  email_id: "bhumil1639.be23@chitkara.edu.in",
  college_roll_number: "2310991639"
};

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/bfhl", (req, res) => {
  try {
    const { data } = req.body || {};

    if (!Array.isArray(data)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid input. Expected JSON body like: { "data": ["A->B"] }'
      });
    }

    const result = processHierarchy(data, identity);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      error: true,
      message: "Internal server error"
    });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
