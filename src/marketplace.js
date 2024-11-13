import express from "express";
import multer from "multer";
import path from "path";
import pool from "./database.js";
import { authorize } from "./account.js";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const router = express.Router();
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "public", "products"));
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

/*

/market/              -
/market/add           (auth)
/market/edit/:id      (auth on matching id)
/market/view/:id      -
/market/delete/:id    (auth on matching id)

*/

// Views

router.get("/", async (req, res) => {
  let products = [];
  let message;

  try {
    let result = await pool.query(`
      SELECT 
        p.id, 
        username AS seller, 
        product_name AS name, 
        product_desc AS desc, 
        start_time AS start, 
        closing_time AS close, 
        price, 
        ARRAY_AGG(image_name) AS images
      FROM users
      INNER JOIN products AS p ON users.id = p.user_id
      INNER JOIN auctions ON p.id = auctions.product_id
      INNER JOIN images AS i ON p.id = i.product_Id
      GROUP BY p.id, username, product_name, product_desc, start_time, closing_time, price;
    `);

    products = result.rows;
    console.log(products);
  } catch (error) {
    console.log(error);
    message = error;
  }

  return res.render("marketplace", {
    products: products,
    error: message,
  });
});

router.get("/view/:id", async (req, res) => {
  let id = req.params["id"];
  let product;
  let message;

  // Validate on ID

  try {
    let result = await pool.query(
      `
      SELECT
        username AS seller,
        product_name as name,
        product_desc AS desc,
        start_time AS start,
        closing_time AS close,
        price,
        ARRAY_AGG(image_name) AS images
      FROM users
      INNER JOIN products AS p ON users.id = p.user_id
      INNER JOIN auctions ON p.id = auctions.product_id
      INNER JOIN images AS i ON p.id = i.product_id
      WHERE p.id = $1
      GROUP BY username, product_name, product_desc, start_time, closing_time, price;
    `,
      [id]
    );

    product = result.rows[0];
  } catch (error) {
    console.log(error);
    message = error;
  }

  console.log(product);

  return res.render("product", {
    product: product,
    error: message,
  });
});

router.get("/add", authorize, (req, res) => {
  res.render("add-product");
});

router.get("/edit/:id", authorize, async (req, res) => {});

//

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
