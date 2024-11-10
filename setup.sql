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
    uploaded_on TIMESTAMP DEFAULT NOW(),
    user_id INT NOT NULL,

    CONSTRAINT fk_user_prod
    FOREIGN KEY(user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

DROP TABLE IF EXISTS images;
CREATE TABLE images
(
    id SERIAL PRIMARY KEY,
    image_name TEXT NOT NULL,
    product_id INT NOT NULL,

    CONSTRAINT fk_prod_image
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE CASCADE
);

DROP TABLE IF EXISTS auctions;
CREATE TABLE auctions 
(
    id SERIAL PRIMARY KEY,
    start_time TIMESTAMP DEFAULT NOW(),
    closing_time TIMESTAMP NOT NULL,
    product_id INT NOT NULL,

    CONSTRAINT fk_prod_auction
    FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE CASCADE
);