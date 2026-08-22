const express = require("express");

const app = express();

const PORT = 3000; // Creates the backend application

// Allow Express to serve our frontend files
app.use(express.static(__dirname));

// Simple backend test route
app.get("/api/health", (req, res) => {
  res.json({
    message: "Altrium backend is working!"
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});