# 🛍️ BuyIT Backend (Node.js + Express + MySQL)

Ez a projekt egy egyszerű webshop backend Node.js és Express keretrendszer segítségével, MySQL adatbázis kapcsolattal. A backend támogatja a termékek listázását, felhasználói regisztrációt, bejelentkezést, jogosultságkezelést, kosárműveleteket és rendeléskezelést.

## ⚙️ Telepítés

1. Klónozd a repót vagy töltsd le a fájlokat.
2. Telepítsd a szükséges csomagokat:

```bash
npm install
```

3. Hozz létre `.env` fájlt a projekt gyökérkönyvtárában az alábbi tartalommal:

```
PORT=3000
HOSTNAME=localhost
DB_HOST=localhost
DB_PORT=3306
DB_USER=youruser
DB_PASSWORD=yourpassword
DB_DATABASE=yourdatabase
JWT_SECRET=yourjwtsecret
```

4. Indítsd el az alkalmazást:

```bash
node app.js
```

---

## 📁 Fő könyvtárak

- `/images` – Feltöltött képek tárolása.
- `.env` – Környezeti változók (nem kerül verziókövetésbe).
  
---

## 🧩️ Függőségek

- `express`
- `mysql2`
- `bcryptjs`
- `jsonwebtoken`
- `dotenv`
- `multer`
- `validator`
- `cors`
- `cookie-parser`

---

## 🔐 Hitelesítés

JWT token-alapú hitelesítés. A token HTTP-only cookie-ként kerül tárolásra a böngészőben (`auth_token`).

---

## 📦 API végpontok

### 🔸 Felhasználók

| Művelet | Módszer | URL | Auth |
|--------|---------|-----|------|
| Regisztráció | `POST` | `/api/register` | ❌ |
| Bejelentkezés | `POST` | `/api/login` | ❌ |
| Kijelentkezés | `POST` | `/api/logout` | ✅ |
| Felhasználók listázása (admin) | `GET` | `/api/admin/users` | ❌ |
| Felhasználó törlése | `POST` | `/api/admin/removeUser` | ❌ |
| Felhasználó neve | `GET` | `/api/getUsername` | ✅ |
| Felhasználó szerepköre | `GET` | `/api/getRole` | ✅ |
| Jelszó módosítás | `PUT` | `/api/editProfilePsw` | ✅ |
| Profilkép lekérés | `GET` | `/api/getProfilePic` | ✅ |
| Felhasználók száma | `GET` | `/api/usercount` | ❌ |

---

### 🔸 Termékek

| Művelet | Módszer | URL | Auth |
|--------|---------|-----|------|
| Összes termék | `GET` | `/api/getProducts` | ❌ |
| Mobiltelefonok | `GET` | `/api/getPhones` | ❌ |
| Tabletek | `GET` | `/api/getTablets` | ❌ |
| Laptops | `GET` | `/api/getLaptops` | ❌ |
| Termék hozzáadása | `POST` | `/api/addItem` | ✅ |
| Termék keresés | `GET` | `/api/search/:searchQuery` | ✅ |

---

### 🛒 Kosár

| Művelet | Módszer | URL | Auth |
|--------|---------|-----|------|
| Kosár tartalom lekérése | `GET` | `/api/cart/getItems` | ✅ |
| Kosárhoz adás | `POST` | `/api/cart/add` | ✅ |
| Kosárból törlés | `POST` | `/api/cart/remove` | ✅ |

---

### 📦 Rendelések

| Művelet | Módszer | URL | Auth |
|--------|---------|-----|------|
| Rendelés létrehozása | `POST` | `/api/createOrder` | ✅ |
| Rendelések lekérése (admin) | `GET` | `/api/getAllOrders` | ✅ |
| Rendelés törlése | `DELETE` | `/api/deleteOrder/:order_id` | ✅ |
| Rendelési tételek | `GET` | `/api/getAllOrdersItems` | ✅ |
| Saját rendelések | `GET` | `/api/orderGet` | ✅ |
| Utolsó rendelés összegzése | `GET` | `/api/getSummary` | ✅ |

---

## 🛡️ Middleware

- `authenticateToken` – Ellenőrzi a `auth_token` cookie-t és dekódolja a JWT-t.

---

## 🖼️ Fájlkezelés

- Multer használatával képek feltöltése a `/images` könyvtárba.
- Csak képek (jpeg, jpg, png, webp stb.) engedélyezettek.

---

## 📌 Megjegyzés

Az alkalmazás HTTPS-t vár el (`secure: true` cookie-k esetén), ezért fejlesztés alatt használj HTTPS-es lokális szervert vagy módosítsd ideiglenesen a `secure: false` beállítást a cookie-knál.

---

