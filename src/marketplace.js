import express from "express";
import multer from "multer";
import path from "path";
import pool from "./database.js";

const router = express.Router();
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(path.dirname(""), "public", "products"));
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const fileFilter = (req, file, cb) => {
  cb(null, file.mimetype.startsWith("image/"));
};
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

router.get("/", async (req, res) => {
  let products = [];

  try {
    let product_results = await pool.query("SELECT * FROM products;");
    let rows = product_results.rows;

    for (let row of rows) {
      let product = {};
      let uid = row["user_id"];
      let pid = row["id"];
      product["name"] = row["product_name"];
      product["desc"] = row["product_desc"];

      // Get owner
      let user_results = await pool.query(
        "SELECT username FROM users WHERE id = $1",
        [uid],
      );
      product["owner"] = user_results.rows[0]["username"];

      // Get images
      let image_results = await pool.query(
        "SELECT image_name FROM images WHERE product_id = $1",
        [pid],
      );
      product["images"] = image_results.rows.map((row) => row["image_name"]);

      products.push(product);
    }
  } catch (error) {
    products = [];
  }

  return res.render("marketplace", { products: products });
});

router.get("/item/:id", (req, res) => {
  // TODO: individual item view
});

//
let authorize = (req, res, next) => {
  // TODO: move to relevant service
  // TODO: check if token in db
  let { token } = req.cookies;
  if (token !== undefined) next();
  else return res.redirect("/account/login");
};

// TODO: remove later
router.get("/logout", (req, res) => {
  res.clearCookie("token");
  return res.redirect("/account/login");
});

router.get("/add", authorize, (req, res) => {
  res.render("add-product");
});

router.post("/add", authorize, upload.array("images"), async (req, res) => {
  let body = Object.create(Object.prototype);
  Object.assign(body, req.body);
  let files = req.files;

  // Validation
  if (
    !body.hasOwnProperty("name") ||
    !body.hasOwnProperty("desc") ||
    files.length === 0
  ) {
    return res.status(400).json({ message: "Missing or incorrect inputs." });
  }

  let name = body["name"];
  let desc = body["desc"];

  if (name.length === 0) {
    return res.status(400).json({ message: "Product name is required." });
  } else if (name.length > 100) {
    return res
      .status(400)
      .json({ message: "Product name cannot excceed 100 characters." });
  }

  // TODO: Get matching user from token
  let uid;
  try {
    let result = await pool.query("SELECT id FROM users;");
    uid = result.rows[0]["id"];
    console.log(uid);
  } catch (error) {
    console.log(error);
    return res.status(500).json();
  }

  // Upload products into db
  let client = await pool.connect();
  try {
    await client.query("BEGIN");
    let pid = await client.query(
      "INSERT INTO products (product_name, product_desc, user_id) VALUES ($1, $2, $3) RETURNING id;",
      [name, desc, uid],
    );
    pid = pid.rows[0]["id"];
    for (let file of files) {
      await client.query(
        "INSERT INTO images (image_name, product_id) VALUES ($1, $2);",
        [file.filename, pid],
      );
    }
    await client.query("COMMIT");
    res.status(200);
  } catch (error) {
    console.log(error);
    await client.query("ROLLBACK");
    res.status(400);
  } finally {
    client.release();
  }

  return res.json({});
});

// TODO: edit item view
router.get("/edit/:id", authorize, (req, res) => {});

// TODO: edit item func
router.post("/edit/:id", authorize, (req, res) => {});

// TODO: del item func
router.post("/delete/:id", authorize, (req, res) => {});

export default router;
