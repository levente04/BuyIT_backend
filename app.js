const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const validator = require('validator');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { ifError } = require('assert');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended:true }));
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500'], 
    credentials: true
}));
app.use(cookieParser());

// az images mappában lévő fájlok elérése
app.use("/images", express.static(path.join(__dirname, "images")));

dotenv.config();
const PORT = process.env.PORT;
const HOSTNAME = process.env.HOSTNAME;

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    timezone: 'Z',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const uploadDir = 'images/';
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir)
        }
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        if (!req.users || !req.users.id) {
            return cb(new Error("User ID not found, authentication required."));
        }
        
        const now = new Date().toISOString().split('T')[0];
        cb(null, `${req.users.id}-${now}-${file.originalname}`);
    }
    
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: function(req, file, cb) {
        const filetypes = /jpeg|jpg|png|gif|webp|avif/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if(extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Csak képformátumok megengedettek!'));       
        }
    }
});

const JWT_SECRET = process.env.JWT_SECRET;

function authenticateToken(req, res, next) {
    const token = req.cookies.auth_token;
    if (!token) {
        return res.status(403).json({ error: 'Nincs token' });
    }

    jwt.verify(token, JWT_SECRET, (err, users) => {
        if (err) {
            return res.status(403).json({ error: 'Van token, csak épp nem érvényes' });
        }
        req.users = users;
        next();
    });
}

// API végpontok
app.get("/api/getProducts", (req, res) => {
    const sql = "SELECT * FROM products";

    pool.query(sql, (error, results) => {
        if (error) {
            console.error("Error fetching products:", error);
            res.status(500).json({ error: "Internal Server Error" });
            return;
        }
        res.json(results);
    });
});

app.get("/api/getPhones", (req, res) => {
    const sql = "SELECT * FROM products WHERE itemCategory = 'Mobiltelefon'";

    pool.query(sql, (error, results) => {
        if (error) {
            console.error("Error fetching products:", error);
            res.status(500).json({ error: "Internal Server Error" });
            return;
        }
        res.json(results);
    });
});

app.get("/api/getTablets", (req, res) => {
    const sql = "SELECT * FROM products WHERE itemCategory = 'Tablet'";

    pool.query(sql, (error, results) => {
        if (error) {
            console.error("Error fetching products:", error);
            res.status(500).json({ error: "Internal Server Error" });
            return;
        }
        res.json(results);
    });
});

app.get("/api/getLaptops", (req, res) => {
    const sql = "SELECT * FROM products WHERE itemCategory = 'Laptop'";

    pool.query(sql, (error, results) => {
        if (error) {
            console.error("Error fetching products:", error);
            res.status(500).json({ error: "Internal Server Error" });
            return;
        }
        res.json(results);
    });
});

app.get('/api/search/:searchQuery', authenticateToken, (req, res) => {
    const searchQuery = req.params.searchQuery;
    console.log(searchQuery);

    if (!searchQuery) {
        return res.status(400).json({ error: 'Search query is required' });
    }

    const sqlQuery = `
    SELECT * 
    FROM products
    WHERE products.itemName LIKE ?
       `;
       const values = [
        `%${searchQuery}%`
    ];
    
    pool.query(sqlQuery, values, (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: 'Database error' });
        }
        console.log(results);
        res.json(results);
    });
});

app.get('/api/admin/users', (req, res) => {
    pool.query('SELECT * FROM users', (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(results);
    });
});

// Route to remove user
app.post('/api/admin/removeUser', (req, res) => {
    const { user_id } = req.body;
    pool.query('DELETE FROM users WHERE user_id = ?', [user_id], (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to remove user' });
        res.json({ message: 'User removed successfully' });
    });
});


app.get('/api/getRole', authenticateToken, (req, res) => {

    const userRole = req.users.role;


    if (!userRole) {
        return res.status(403).json({ message: 'Access denied, no role found.' });
    }


    res.json({ role: userRole });
});

app.get('/api/getUsername', authenticateToken, (req, res) => {
    const user_id = req.users.id;

    const sql = 'SELECT name FROM users WHERE user_id = ?';
    pool.query(sql, [user_id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Hiba az SQL-ben' });
        }

        if (result.length === 0) {
            return res.status(404).json({ error: 'Felhasználó nem található' });
        }

        return res.status(200).json({ name: result[0].name });
    });
});

app.get('/api/usercount', (req, res) => {
    const sql = 'SELECT COUNT(*) AS count FROM users';

    pool.query(sql, (err, result) => {
        if (err) {
            console.error("SQL Error:", err);
            return res.status(500).json({ error: 'Hiba az SQL-ben' });
        }

        if (result.length === 0) {
            return res.status(404).json({ error: 'Nincs felhasználó' });
        }

        return res.status(200).json({ userCount: result[0].count });
    });
});

// regisztráció
app.post('/api/register', (req, res) => {
    const { name, email, psw } = req.body;
    const errors = [];

    if (validator.isEmpty(name)) {
        errors.push({ error: 'Töltsd ki a nevet!' });
    }

    if (!validator.isEmail(email)) {
        errors.push({ error: 'Nem valós email cím!' });
    }

    if (!validator.isLength(psw, { min: 6 })) {
        errors.push({ error: 'A jelszónak legalább 6 karakternek kell lennie!' });
    }

    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }

    bcrypt.hash(psw, 10, (err, hash) => {
        if (err) {
            return res.status(500).json({ error: 'Hiba a hashelés során' });
        }
        
        const sql = 'INSERT INTO users(user_id, name, email, psw) VALUES(NULL, ?, ?, ?)';

        pool.query(sql, [name, email, hash], (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Az email már foglalt!' });
            }
            res.status(201).json({ message: 'Sikeres regisztráció! '});
        });
    });
});

app.post('/api/addItem', authenticateToken, upload.single('image'), (req, res) => {
    const { itemName, itemCategory, itemPrice, stock } = req.body;
    const image = req.file ? req.file.filename : null;
    const errors = [];

    if (!itemName || validator.isEmpty(itemName)) {
        errors.push({ error: 'Töltsd ki a termék nevét!' });
    }

    if (!itemCategory || validator.isEmpty(itemCategory)) {
        errors.push({ error: 'Válassz kategóriát!' });
    }

    if (!itemPrice || !validator.isNumeric(itemPrice.toString())) {
        errors.push({ error: 'Nem valós ár!' });
    }

    if (!stock || !validator.isNumeric(stock.toString())) {
        errors.push({ error: 'A raktáron lévő termékek számát add meg!' });
    }

    if (!image) {
        errors.push({ error: 'Termék kép feltöltése kötelező!' });
    }

    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }

    const sql = 'INSERT INTO products (itemName, itemCategory, itemPrice, stock, image) VALUES (?, ?, ?, ?, ?)';

    pool.query(sql, [itemName, itemCategory, itemPrice, stock, image], (err, result) => {
        if (err) {
            console.error('SQL Error:', err);
            return res.status(500).json({ error: 'Hiba az SQL-ben' });
        }
        return res.status(201).json({ message: 'Termék sikeresen hozzáadva!' });
    });
});

// login
app.post('/api/login', (req, res) => {
    const { email, psw } = req.body;
    const errors = [];

    if (!validator.isEmail(email)) {
        errors.push({ error: 'Add meg az email címet '});
    }

    if (validator.isEmpty(psw)) {
        errors.push({ error: 'Add meg a jelszót' });
    }

    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }

    const sql = 'SELECT * FROM users WHERE email LIKE ?';
    pool.query(sql, [email], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Hiba az SQL-ben' });
        }

        if (result.length === 0) {
            return res.status(404).json({ error: 'A felhasználó nem találató' });
        }

        const users = result[0];
        bcrypt.compare(psw, users.psw, (err, isMatch) => {
            if (isMatch) {
                const token = jwt.sign({ id: users.user_id, role: users.role }, JWT_SECRET, { expiresIn: '1y' });
                
                res.cookie('auth_token', token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'none',
                    maxAge: 1000 * 60 * 60 * 24 * 30 * 12
                });

                return res.status(200).json({ message: 'Sikeres bejelentkezés' });
            } else {
                return res.status(401).json({ error: 'Hibás jelszó' });
            }
        });
    });
});

// logout
app.post('/api/logout', (req, res) => {
    // Clear both cookies (if they have different names)
    res.clearCookie('auth_token', {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
    });

    // If you have any other cookie to clear
    res.clearCookie('another_cookie_name', {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
    });

    return res.status(200).json({ message: 'Logged out successfully!' });
});


// tesztelés a jwt-re
app.get('/api/logintest', authenticateToken, (req, res) => {
    return res.status(200).json({ message: 'bent vagy' });
});


// profile kép megjelenítése
app.get('/api/getProfilePic', authenticateToken, (req, res) => {
    const user_id = req.users.id;

    const sql = 'SELECT profile_pic FROM users WHERE user_id = ?';
    pool.query(sql, [user_id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Hiba az SQL-ben' });
        }

        if (result.length === 0) {
            return res.status(404).json({ error: 'A felhasználó nem található' });
        }

        return res.status(200).json(result);
    });
});


// profil jelszó módosítása
app.put('/api/editProfilePsw', authenticateToken, (req, res) => {
    const user_id = req.users.id;
    const psw = req.body.psw;
    const salt = 10;

    console.log(user_id, psw);
    if (psw === '' || !validator.isLength(psw, { min: 6 })) {
        return res.status(400).json({ error: 'A jelszónak min 6 karakterből kell állnia!' });
    }

    bcrypt.hash(psw, salt, (err, hash) => {
        if (err) {
            return res.status(500).json({ error: 'Hiba a sózáskor!' });
        }

        const sql = 'UPDATE users SET psw = COALESCE(NULLIF(?, ""), psw) WHERE user_id = ?';

        pool.query(sql, [hash, user_id], (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Hiba az SQL-ben' });
            }

            return res.status(200).json({ message: 'Jelszó módosítva! Most kijelentkeztetlek.' });
        });
    });
});


app.post('/api/cart/add', authenticateToken, (req, res) => {
    const { product_id } = req.body;
    const user_id = req.users.id;

    // Check if the user already has a cart
    const checkCartQuery = 'SELECT cart_id FROM cart WHERE user_id = ?';
    pool.query(checkCartQuery, [user_id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Error checking cart' });
        }

        let cart_id;
        if (result.length === 0) {
            // If the user doesn't have a cart, create one
            const createCartQuery = 'INSERT INTO cart (user_id) VALUES (?)';
            pool.query(createCartQuery, [user_id], (err, result) => {
                if (err) {
                    return res.status(500).json({ error: 'Error creating cart' });
                }

                cart_id = result.insertId; // The ID of the newly created cart

                // Add item to cart
                addItemToCart(cart_id, product_id, user_id, res);
            });
        } else {
            cart_id = result[0].cart_id; // If the user already has a cart, use it

            // Add item to cart
            addItemToCart(cart_id, product_id, user_id, res);
        }
    });
});

function addItemToCart(cart_id, product_id, user_id, res) {
    const checkItemQuery = 'SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?';
    pool.query(checkItemQuery, [cart_id, product_id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Error checking cart items' });
        }

        if (result.length > 0) {
            // If the item already exists in the cart, update the quantity
            const newQuantity = result[0].quantity + 1;
            const updateQuery = 'UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?';
            pool.query(updateQuery, [newQuantity, cart_id, product_id], (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Error updating item quantity' });
                }
                return res.status(200).json({ message: 'Item quantity updated' });
            });
        } else {
            // If the item does not exist in the cart, add it
            const insertQuery = 'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)';
            pool.query(insertQuery, [cart_id, product_id, 1], (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Error adding item to cart' });
                }
                return res.status(200).json({ message: 'Item added to cart' });
            });
        }
    });
}


app.post('/api/cart/remove', authenticateToken, (req, res) => {
    const user_id = req.users.id;
    const { product_id } = req.body;

    if (!product_id) {
        return res.status(400).json({ error: 'Product ID is required' });
    }

    pool.query('SELECT cart_id FROM cart WHERE user_id = ?', [user_id], (err, cartResult) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        if (cartResult.length === 0) {
            return res.status(404).json({ error: 'No cart found for user' });
        }

        const cart_id = cartResult[0].cart_id;

        // Check if product exists in cart
        pool.query('SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ?', [cart_id, product_id], (err, itemResult) => {
            if (err) return res.status(500).json({ error: 'Database error' });

            if (itemResult.length === 0) {
                return res.status(404).json({ error: 'Product not found in cart' });
            }

            const currentQuantity = itemResult[0].quantity;

            if (currentQuantity > 1) {
                // Decrease quantity if more than 1
                pool.query('UPDATE cart_items SET quantity = quantity - 1 WHERE cart_id = ? AND product_id = ?', [cart_id, product_id], (err) => {
                    if (err) return res.status(500).json({ error: 'Database error' });
                    res.json({ message: 'Item quantity decreased' });
                });
            } else {
                // Remove item if quantity is 1
                pool.query('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?', [cart_id, product_id], (err) => {
                    if (err) return res.status(500).json({ error: 'Database error' });
                    res.json({ message: 'Item removed from cart' });
                });
            }
        });
    });
});

app.get('/api/cart/getItems', authenticateToken, (req, res) => {
    const user_id = req.users.id;

    const sql = `
        SELECT ci.cart_items_id, ci.product_id, ci.quantity, p.itemName, p.itemPrice, p.image
        FROM cart_items ci
        JOIN cart c ON ci.cart_id = c.cart_id
        JOIN products p ON ci.product_id = p.product_id
        WHERE c.user_id = ?
    `;

    pool.query(sql, [user_id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        res.status(200).json(result);
    });
});

app.get('/api/orderedItems', authenticateToken, (req, res) => {
    const order_id = req.params.order_id;
    const sql = 'SELECT order_items.product_id, order_items.quantity, order_items.unit_price, products.itemName FROM order_items JOIN products ON order_items.product_id = products.product_id WHERE order_items.order_id = ?';

    pool.query(sql, [order_id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Hiba az SQL-ben' });
        }

        if (result.length === 0) {
            return res.status(404).json({ error: 'Nincs még rendelt termék' });
        }

        return res.status(200).json(result);
    });
})

app.post('/api/createOrder', authenticateToken, (req, res) => {
    const user_id = req.user.id;
    const cart_id = req.params.cart_id;
    const { city, address, postcode, tel } = req.body;
    let total_amount = 0;

    const sqlSelectCartItems = `
        SELECT 
            cart_items.product_id,
            products.itemName,
            (products.itemPrice * cart_items.quantity) AS total_price,
            products.itemPrice,
            cart_items.quantity
        FROM cart_items
        JOIN products ON cart_items.product_id = products.product_id
        WHERE cart_items.cart_id = ?`;

    const sqlInsertOrder = 'INSERT INTO orders (user_id, order_date, city, address, postcode, tel, total_amount) VALUES (?, NOW(), ?, ?, ?, ?, 0)';
    pool.query(sqlInsertOrder, [user_id, city, address, postcode, tel], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Hiba az SQL-ben' });
        }
        const order_id = result.insertId;

        pool.query(sqlSelectCartItems, [cart_id], (err, items) => {
            if (err) {
                return res.status(500).json({ error: 'Hiba az SQL-ben 2' });
            }

            if (items.length === 0) {
                return res.status(404).json({ error: 'Nincs ilyen kosár' });
            }

            const sqlInsertOrderItems = 'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ?';
            const orderItemsData = items.map(item => [order_id, item.product_id, item.quantity, item.itemPrice]);
            total_amount = items.reduce((sum, item) => sum + item.total_price, 0);

            pool.query(sqlInsertOrderItems, [orderItemsData], (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Hiba az SQL-ben 3' });
                }

                const sqlUpdateOrder = 'UPDATE orders SET total_amount = ? WHERE order_id = ?';
                pool.query(sqlUpdateOrder, [total_amount, order_id], (err) => {
                    if (err) {
                        return res.status(500).json({ error: 'Hiba az SQL-ben 4' });
                    }

                    const sqlDeleteCartItems = 'DELETE FROM cart_items WHERE cart_id = ?';
                    pool.query(sqlDeleteCartItems, [cart_id], (err) => {
                        if (err) {
                            return res.status(500).json({ error: 'Hiba az SQL-ben 5' });
                        }
                        return res.status(200).json({ message: 'Rendelés sikeres' });
                    });
                });
            });
        });
    });
})

app.delete('/api/deleteOrder/:order_id', authenticateToken, (req, res) => {

    const order_id = req.params.order_id;

    const sqlDeleteOrderItems = 'DELETE FROM order_items WHERE order_id = ?';
    const sqlDeleteOrder = 'DELETE FROM orders WHERE order_id = ?';

    pool.query(sqlDeleteOrderItems, [order_id], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Hiba az SQL-ben, rendelési tételek' });
        }

        pool.query(sqlDeleteOrder, [order_id], (err) => {
            if (err) {
                return res.status(500).json({ error: 'Hiba az SQL-ben' });
            }
            return res.status(200).json({ message: 'Rendelés törölve' });
        });
    });
})

app.get('/api/getAllOrders', authenticateToken, (req, res) => {
    const sql = `
        SELECT 
            orders.order_id,
            orders.order_date,
            orders.total_amount,
            users.name,
            orders.city,
            orders.postcode,
            orders.address,
            orders.tel
        FROM orders
        JOIN users ON orders.user_id = users.user_id
        ORDER BY orders.order_date DESC`;

    pool.query(sql, (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Hiba az SQL-ben' });
        }

        if (result.length === 0) {
            return res.status(404).json({ error: 'Nincs rendelés' });
        }

        return res.status(200).json(result);
    });
})

app.get('/api/getAllOrdersItems', authenticateToken, (req, res) => {
    const sql = `
        SELECT 
            order_items.order_id,
            order_items.product_id,
            order_items.quantity,
            order_items.unit_price,
            products.itemName
        FROM order_items
        JOIN products ON order_items.product_id = products.product_id
        ORDER BY order_items.order_id`;

    pool.query(sql, (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Hiba az SQL-ben' });
        }

        if (result.length === 0) {
            return res.status(404).json({ error: 'Nincs rendelési tétel' });
        }

        return res.status(200).json(result);
    });
})

app.get('/api/orderGet', authenticateToken, (req, res) => {
    const user_id = req.user.id;
    const sql = 'SELECT users.name, orders.order_id, orders.order_date, orders.total_amount FROM users JOIN orders ON users.user_id = orders.user_id WHERE users.user_id = ?';
    pool.query(sql, [user_id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Hiba az SQL-ben' });
        }

        if (result.length === 0) {
            return res.status(404).json({ error: 'Nincs még rendelés' });
        }

        return res.status(200).json(result);
    });
})


app.listen(PORT, () => {
    console.log(`IP: https://${HOSTNAME}:${PORT}`);
});