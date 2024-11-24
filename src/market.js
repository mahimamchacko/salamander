import express from "express";
import multer from "multer";
import path from "path";
import pool from "./database.js";
import { authorize } from "./account.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { addRoom } from "./biddingrooms.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const router = express.Router();
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  cb(null, file.mimetype.startsWith("image/"));
};
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

// Views

router.get("/", authorize, async (req, res) => {
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
        ARRAY_AGG(image_name) AS image_names,
        ARRAY_AGG(i.id) AS image_ids
      FROM users
      INNER JOIN products AS p ON users.id = p.seller_id
      INNER JOIN images AS i ON p.id = i.product_Id
      GROUP BY p.id, username, product_name, product_desc, start_time, closing_time, price;
    `);
    products = result.rows;
    if (products.length === 0) {
      message = "There are no products available.";
    }
  } catch (error) {
    console.log("SELECT FAILED", error);
    message = error;
  }

  return res.render("market", { message, products });
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
        p.id,
        username AS seller,
        product_name as name,
        product_desc AS desc,
        start_time AS start,
        closing_time AS close,
        price,
        ARRAY_AGG(image_name) AS image_names,
        ARRAY_AGG(i.id) AS image_ids
      FROM users
      INNER JOIN products AS p ON users.id = p.seller_id
      INNER JOIN images AS i ON p.id = i.product_id
      WHERE p.id = $1
      GROUP BY p.id, username, product_name, product_desc, start_time, closing_time, price;
    `,
      [id]
    );

    product = result.rows[0];
  } catch (error) {
    console.log(error);
    message = error;
  }

  console.log(product);

  return res.render("market-view", {
    product: product,
    error: message,
  });
});

router.get("/view/:id/:imageid", async (req, res) => {
  let image_id = req.params["imageid"];
  let image;
  let image_type;
  let message;

  try {
    let result = await pool.query(
      `
      SELECT image_name, image_data FROM images WHERE id = $1
    `,
      [image_id]
    );

    if (result.rows.length === 1) {
      image = result.rows[0]["image_data"];
      let temp = result.rows[0]["image_name"].split(".");
      image_type = "image/" + temp[temp.length - 1];
      return res.set("Content-Type", image_type).send(image);
    } else {
      message = "Image with matching id not found";
    }
  } catch (error) {
    message = error;
  }

  return res.status(500).json({ error: message });
});

router.get("/add", authorize, (req, res) => {
  res.render("add-product");
});

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
  let errors = [];

  // Upload products into db
  let user_id = req.params["user"];
  let client = await pool.connect();
  try {
    await client.query("BEGIN");
    let product_id = await client.query(
      "INSERT INTO products (product_name, product_desc, seller_id, start_time, closing_time, price) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;",
      [
        product_name,
        product_desc,
        user_id,
        product_start_time,
        product_closing_time,
        product_price,
      ]
    );
    product_id = product_id.rows[0]["id"];

    for (let i = 0; i < files.length; i++) {
      await client.query(
        "INSERT INTO images (image_name, image_data, image_order, product_id) VALUES ($1, $2, $3, $4);",
        [files[i].originalname, files[i].buffer, i + 1, product_id]
      );
    }

    await client.query("COMMIT");

    addRoom(
      product_id,
      product_price,
      product_start_time,
      product_closing_time
    );
  } catch (error) {
    console.log(error);
    errors.push(error);
    await client.query("ROLLBACK");
  } finally {
    client.release();
  }

  if (errors.length === 0) {
    return res.status(200).redirect("/account/dashboard/");
  } else {
    return res.status(400).json({ errors: errors });
  }
});

export { router };
