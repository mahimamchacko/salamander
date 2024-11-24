DROP DATABASE IF EXISTS salamander;
CREATE DATABASE salamander;
\c salamander

DROP TABLE IF EXISTS users;
CREATE TABLE users
(
    id SERIAL PRIMARY KEY,
    username varchar(30),
    password varchar(100)
);

DROP TABLE IF EXISTS tokens;
CREATE TABLE tokens
(
    username varchar(30),
    token varchar(64) PRIMARY KEY
);

DROP TABLE IF EXISTS products;
CREATE TABLE products
(
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    product_desc TEXT,
    seller_id INT NOT NULL,
    start_time TIMESTAMP DEFAULT NOW(),
    closing_time TIMESTAMP NOT NULL,
    price NUMERIC(8, 2) NOT NULL CHECK (price >= 0),
    winner_id INT NULL,

    CONSTRAINT fk_seller_id
    FOREIGN KEY(seller_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

    CONSTRAINT fk_winner_id
    FOREIGN KEY(winner_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

DROP TABLE IF EXISTS images;
CREATE TABLE images
(
    id SERIAL PRIMARY KEY,
    image_name TEXT NOT NULL,
    image_data BYTEA,
    image_order INT NOT NULL CHECK (image_order >= 1),
    product_id INT NOT NULL,

    CONSTRAINT fk_prod_image
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE CASCADE
);