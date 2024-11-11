import express from "express";
import multer from "multer";
import path from "path";
import pool from "./database.js";
import { authorize } from "./auth.js";

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
    let result = await pool.query(`
      SELECT product_id, username, product_name, product_desc, start_time, closing_time, price
      FROM products
      INNER JOIN users ON users.id = products.user_id
      INNER JOIN auctions ON auctions.product_id = products.id;
    `);

    for (let row of result.rows) {
      let result2 = await pool.query(
        `
        SELECT image_name FROM images WHERE product_id = $1;  
      `,
        [row["product_id"]]
      );

      products.push({
        owner: row["username"],
        name: row["product_name"],
        desc: row["product_desc"],
        price: row["price"],
        start: row["start_time"],
        end: row["closing_time"],
        images: result2.rows.map((row) => row["image_name"]),
      });
    }
  } catch (error) {}

  console.log(products);
  return res.render("marketplace", { products: products });
  // try {
  //   let product_results = await pool.query("SELECT * FROM products;");
  //   let rows = product_results.rows;

  //   for (let row of rows) {
  //     let product = {};
  //     let uid = row["user_id"];
  //     let pid = row["id"];
  //     product["name"] = row["product_name"];
  //     product["desc"] = row["product_desc"];

  //     // Get owner
  //     let user_results = await pool.query(
  //       "SELECT username FROM users WHERE id = $1",
  //       [uid]
  //     );
  //     product["owner"] = user_results.rows[0]["username"];

  //     // Get images
  //     let image_results = await pool.query(
  //       "SELECT image_name FROM images WHERE product_id = $1",
  //       [pid]
  //     );
  //     product["images"] = image_results.rows.map((row) => row["image_name"]);

  //     products.push(product);
  //   }
  // } catch (error) {
  //   products = [];
  // }

  return res.render("marketplace", { products: products });
});

router.get("/item/:id", (req, res) => {
  // TODO: individual item view
});

router.get("/add", authorize, (req, res) => {
  res.render("add-product");
});

router.post("/add", authorize, upload.array("images"), async (req, res) => {
  let body = Object.create(Object.prototype);
  Object.assign(body, req.body);
  let files = req.files;

  let product_name = body["name"];
  let product_desc = body["desc"];
  let product_start_time = body["start"];
  let product_closing_time = body["end"];
  let product_price = body["price"];

  // TODO: validation

  // Get User ID from token
  let { token } = req.cookies;
  let user_id;
  try {
    let result = await pool.query(
      `
      SELECT id FROM users
      INNER JOIN tokens ON tokens.username = users.username
      WHERE token = $1;
    `,
      [token]
    );

    user_id = result.rows[0]["id"];
  } catch (error) {
    return res.status(500).json();
  }

  // Upload products into db
  let client = await pool.connect();
  try {
    await client.query("BEGIN");
    let product_id = await client.query(
      "INSERT INTO products (product_name, product_desc, user_id) VALUES ($1, $2, $3) RETURNING id;",
      [product_name, product_desc, user_id]
    );
    product_id = product_id.rows[0]["id"];

    for (let file of files) {
      await client.query(
        "INSERT INTO images (image_name, product_id) VALUES ($1, $2);",
        [file.filename, product_id]
      );
    }

    await client.query(
      "INSERT INTO auctions (start_time, closing_time, price, product_id) VALUES ($1, $2, $3, $4);",
      [product_start_time, product_closing_time, product_price, product_id]
    );

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
