# PHP + MySQL Transaction Lookup

A self-directed engineering lab built to learn a Windows-hosted Apache/PHP/MySQL stack and demonstrate a small, read-only transaction lookup workflow. The application uses **synthetic records only**. It does not connect to a payment gateway, handle cardholder data, or process payments.

## Demonstrated functionality

- HTML/CSS/JavaScript dashboard served by Apache
- JavaScript `fetch()` calls to a PHP JSON API
- PHP MySQLi connection using a dedicated, least-privilege account
- Prepared statement for transaction-number lookups
- Return of transaction records as JSON and display in a searchable dashboard
- Unfiltered listing sorted by transaction date
- Client-side status filtering and summary metrics

## Technology and architecture

**Lab environment:** Windows Server 2019 virtual machine on Hyper-V, WampServer, Apache, PHP, and MySQL.

```text
Browser (HTML/CSS/JavaScript)
     | HTTP GET /pmiproject/api/transactions.php?trans_num=1001
     v
Apache -> PHP (MySQLi)
               | SELECT from PMIPROJECT.sales
               v
             MySQL
               | associative rows
               v
           PHP JSON response -> JavaScript updates the page
```

## Repository layout

```text
index.html
styles.css
app.js
api/
  transactions.php
README.md
.gitignore
```

## Local setup (development only)

1. Install a compatible WAMP stack with Apache, PHP and MySQL, including the PHP MySQLi/mysqlnd support required by `get_result()`.
2. Place the repository files under a directory such as `C:\wamp64\www\pmiproject\`. Open the application via `http://localhost/pmiproject/` rather than `file://`.
3. Create a local MySQL database named `PMIPROJECT` and a `sales` table matching the schema below. Insert synthetic test transactions.
4. Create a **local-only** MySQL account `app_user` with `SELECT` on `PMIPROJECT.*`; do not use MySQL `root` for the application.
5. Create a private file `C:\wamp64\private\pmiproject-db.php` **outside Apache's DocumentRoot**, with the structure shown below. Do not commit this file.
6. Ensure the local database connection and directory layout match the environment, then request the API endpoint directly and test the frontend.

Example local schema:

```sql
CREATE DATABASE IF NOT EXISTS PMIPROJECT;
USE PMIPROJECT;

CREATE TABLE sales (
    trans_num INT PRIMARY KEY,
    trans_date DATETIME NOT NULL,
    trans_amnt DECIMAL(10,2) NOT NULL,
    trans_status VARCHAR(18) NOT NULL,
    store_num CHAR(10) NOT NULL,
    cashier_id CHAR(7) NOT NULL
);
```

**Private configuration template — do not place an actual credential in this repository:**

```php
<?php
return [
    'host' => 'localhost',
    'username' => 'app_user',
    'password' => 'REPLACE_LOCALLY',
    'database' => 'PMIPROJECT',
    'port' => 3306,
];
```

The PHP endpoint currently loads that file relative to its deployed location using `dirname(__DIR__, 3) . '/private/pmiproject-db.php'`. Adapt this path if the project is hosted in a different directory structure.

## API examples

| Request | Current behavior |
| --- | --- |
| `GET /pmiproject/api/transactions.php?trans_num=1001` | Retrieve matching transaction records |
| `GET /pmiproject/api/transactions.php` | List records ordered by transaction date |
| `GET /pmiproject/api/transactions.php?trans_num=9999` | Return an empty `transactions` array if there is no match |

A successful response uses this structure:

```json
{
  "success": true,
  "transactions": [
    {
      "trans_num": 1001,
      "trans_date": "2026-04-21 13:47:30",
      "trans_amnt": "3.07",
      "trans_status": "Approved",
      "store_num": "1234567890",
      "cashier_id": "1234567"
    }
  ]
}
```

## Security and limitations

This is a **learning demonstration, not production payment software**.

- Only synthetic transaction data is used; no payment card details or real merchant records.
- Database permissions are read-only for the application account.
- Credentials are held locally outside the web directory, not committed to the repository.
- Prepared statements are used for parameterized transaction queries.
- Additional work is required for strict input validation, bounded list queries, consistent error responses, application authentication/authorization, logging, tests, and production hardening.
- There is no hosted/live demo; the project runs locally on the author's lab VM.

## Development notes

I configured the Windows Server/WampServer lab, created the MySQL schema and restricted database account, developed the PHP/MySQLi backend with guidance, and troubleshot the HTTP/frontend-to-API integration. The HTML/CSS/JavaScript frontend was AI-assisted so I could focus on learning backend development and infrastructure.

The project is deliberately a starting point for further study of PHP, MySQL administration, application security, and testing.
