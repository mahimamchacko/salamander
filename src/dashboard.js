import express from "express";
import pool from "./database.js";
import { authorize } from "./account.js";

const router = express.Router();

/* Views */

router.get("/", authorize, (req, res) => {
  return res.redirect("/account/dashboard/products");
});

router.get("/products", authorize, async (req, res) => {
  let user = req.params["user"];
  let products = [];
  let productsOnSale = [];
  let productsSold = [];

  try {
    let result = await pool.query(
      `
      SELECT
        p.id,
        product_name AS name,
        product_desc AS desc,
        start_time AS start,
        closing_time AS close,
        price,
        (winner_id IS NOT NULL) AS sold,
        image_name AS thumbnail,
        i.id AS thumbnail_id
      FROM products AS p
      INNER JOIN images AS i ON p.id = i.product_id
      WHERE p.seller_id = $1 AND i.image_order = 1;
    `,
      [user]
    );

    products = result.rows;
    let now = new Date();
    for (let product of products) {
      if (product.close < now) {
        productsSold.push(product);
      } else {
        productsOnSale.push(product);
      }
    }
  } catch (error) {
    console.log(error);
  }

  res.render("dashboard/dashboard", {
    products: products,
    productsOnSale: productsOnSale,
    productsSold: productsSold,
  });
});

router.get("/products/add", authorize, (req, res) => {
  return res.render("dashboard/add");
});

router.get("/purchases", authorize, async (req, res) => {
  return res.render("dashboard/history");
});

export default router;
