require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();

console.log("SERVER FILE:", __filename);
console.log("NODE VERSION:", process.version);

const PORT = process.env.PORT || 3000;

// ==================================================
// ENVIRONMENT VARIABLES
// ==================================================

if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is missing in .env");
}

if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET is missing in .env");
}

if (!process.env.ADMIN_EMAIL) {
  console.error("❌ ADMIN_EMAIL is missing in .env");
}

if (!process.env.ADMIN_PASSWORD) {
  console.error("❌ ADMIN_PASSWORD is missing in .env");
}

// ==================================================
// MIDDLEWARE
// ==================================================

app.use(cors());
app.use(express.json());

// ==================================================
// SERVE FRONTEND
// ==================================================

// Serve HTML, CSS, JavaScript, images and other
// frontend files from the project folder.
app.use(express.static(__dirname, {
  index: false
}));

// ==================================================
// HOME PAGE
// ==================================================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Index.html"));
});

// ==================================================
// USER SCHEMA
// ==================================================

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

// ==================================================
// LOGIN HISTORY SCHEMA
// ==================================================

const loginHistorySchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    role: {
      type: String,
      enum: ["customer", "admin"],
      required: true,
    },

    loginTime: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const LoginHistory = mongoose.model(
  "LoginHistory",
  loginHistorySchema
);

// ==================================================
// MENU SCHEMA
// ==================================================

const menuSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },

  description: {
    type: String,
    required: true,
    trim: true,
  },

  price: {
    type: Number,
    required: true,
    min: 0,
  },

  meal: {
    type: String,
    enum: [
      "Breakfast",
      "Lunch",
      "Dinner",
      "Snacks & Beverages",
      "Desserts",
    ],
    required: true,
  },

  image: {
    type: String,
    default: "",
    trim: true,
  },
});

const Menu = mongoose.model("Menu", menuSchema);

// ==================================================
// ORDER SCHEMA
// ==================================================

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    customerName: {
      type: String,
      required: true,
      trim: true,
    },

    customerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    pincode: {
      type: String,
      required: true,
      trim: true,
    },

    paymentMethod: {
      type: String,
      enum: [
        "Cash on Delivery",
        "UPI",
      ],
      required: true,
    },

    items: {
      type: Array,
      required: true,
      validate: {
        validator: function (value) {
          return (
            Array.isArray(value) &&
            value.length > 0
          );
        },

        message:
          "Order must contain at least one item.",
      },
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },

    orderDate: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: [
        "Placed",
        "Confirmed",
        "Preparing",
        "Out for Delivery",
        "Delivered",
        "Cancelled",
      ],
      default: "Placed",
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model(
  "Order",
  orderSchema
);

// ==================================================
// SIGNUP API
// ==================================================

app.post("/signup", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
    } = req.body;

    if (
      !name ||
      !email ||
      !phone ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "All fields are required.",
      });
    }

    const normalizedEmail =
      email.toLowerCase().trim();

    const existingUser =
      await User.findOne({
        email: normalizedEmail,
      });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "Email already exists.",
      });
    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    const newUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      password: hashedPassword,
    });

    await newUser.save();

    console.log(
      "✅ New user registered:",
      normalizedEmail
    );

    res.status(201).json({
      success: true,
      message: "Signup Successful",
    });

  } catch (error) {
    console.error(
      "❌ Signup Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error during signup.",
    });
  }
});

// ==================================================
// CUSTOMER LOGIN API
// ==================================================

app.post("/login", async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required.",
      });
    }

    const normalizedEmail =
      email.toLowerCase().trim();

    const user =
      await User.findOne({
        email: normalizedEmail,
      });

    if (!user) {
      return res.json({
        success: false,
        message: "User not found.",
      });
    }

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatch) {
      return res.json({
        success: false,
        message:
          "Incorrect password.",
      });
    }

    // SAVE CUSTOMER LOGIN

    await LoginHistory.create({
      email: user.email,
      role: "customer",
      loginTime: new Date(),
    });

    console.log(
      "✅ Customer login saved:",
      user.email
    );

    // LOGIN SUCCESS

    res.json({
      success: true,
      message:
        "Login Successful",

      user: {
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    });

  } catch (error) {
    console.error(
      "❌ Login Error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Server error during login.",
    });
  }
});

// ==================================================
// ADMIN LOGIN API
// ==================================================

app.post(
  "/admin/login",
  async (req, res) => {
    try {
      const {
        email,
        password,
      } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message:
            "Admin email and password are required.",
        });
      }

      const normalizedEmail =
        email.toLowerCase().trim();

      const adminEmail =
        (
          process.env.ADMIN_EMAIL ||
          ""
        )
          .toLowerCase()
          .trim();

      const adminPassword =
        process.env.ADMIN_PASSWORD || "";

      // CHECK ADMIN CREDENTIALS

      if (
        normalizedEmail !== adminEmail ||
        password !== adminPassword
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid admin email or password.",
        });
      }

      // SAVE ADMIN LOGIN

      await LoginHistory.create({
        email: normalizedEmail,
        role: "admin",
        loginTime: new Date(),
      });

      console.log(
        "✅ Admin login saved:",
        normalizedEmail
      );

      // CREATE JWT TOKEN

      const token = jwt.sign(
        {
          email: normalizedEmail,
          role: "admin",
        },

        process.env.JWT_SECRET,

        {
          expiresIn: "15d",
        }
      );

      // ADMIN LOGIN SUCCESS

      res.json({
        success: true,
        message:
          "Admin login successful.",

        token: token,

        admin: {
          email: normalizedEmail,
          role: "admin",
        },
      });

    } catch (error) {
      console.error(
        "❌ Admin Login Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Server error during admin login.",
      });
    }
  }
);

// ==================================================
// ADMIN AUTHENTICATION
// ==================================================

function verifyAdmin(
  req,
  res,
  next
) {
  try {
    const authHeader =
      req.headers.authorization;

    // CHECK AUTHORIZATION

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message:
          "Admin authentication required.",
      });
    }

    // CHECK BEARER FORMAT

    const parts =
      authHeader.split(" ");

    if (
      parts.length !== 2 ||
      parts[0] !== "Bearer" ||
      !parts[1]
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid authorization format.",
      });
    }

    const token = parts[1];

    // VERIFY TOKEN

    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    // CHECK ADMIN ROLE

    if (
      decoded.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Admin access required.",
      });
    }

    // STORE ADMIN INFO

    req.admin = decoded;

    next();

  } catch (error) {
    console.error(
      "❌ Admin Authentication Error:",
      error.message
    );

    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired admin token.",
    });
  }
}

// ==================================================
// ADD MENU ITEM
// ==================================================

app.post(
  "/api/menu",
  verifyAdmin,
  async (req, res) => {
    try {
      const {
        name,
        description,
        price,
        meal,
        image,
      } = req.body;

      if (
        !name ||
        !description ||
        price === undefined ||
        !meal
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Name, description, price and meal are required.",
        });
      }

      const menuItem = new Menu({
        name,
        description,
        price,
        meal,
        image: image || "",
      });

      await menuItem.save();

      res.status(201).json({
        success: true,
        message:
          "Menu item added successfully.",
        data: menuItem,
      });

    } catch (error) {
      console.error(
        "❌ Add Menu Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Server error while adding menu item.",
      });
    }
  }
);

// ==================================================
// GET ALL MENU ITEMS
// ==================================================

app.get(
  "/api/menu",
  async (req, res) => {
    try {
      const menu =
        await Menu.find().sort({
          meal: 1,
          name: 1,
        });

      res.json(menu);

    } catch (error) {
      console.error(
        "❌ Menu Fetch Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Server error while fetching menu.",
      });
    }
  }
);

// ==================================================
// UPDATE MENU ITEM
// ==================================================

app.put(
  "/api/menu/:id",
  verifyAdmin,
  async (req, res) => {
    try {
      console.log(
        "✏️ UPDATE MENU ROUTE HIT"
      );

      console.log(
        "Menu ID:",
        req.params.id
      );

      const {
        name,
        description,
        price,
        meal,
        image,
      } = req.body;

      if (
        !name ||
        !description ||
        price === undefined ||
        !meal
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Name, description, price and meal are required.",
        });
      }

      const updatedItem =
        await Menu.findByIdAndUpdate(
          req.params.id,
          {
            name: name.trim(),
            description:
              description.trim(),
            price: price,
            meal: meal,
            image: image || "",
          },
          {
            new: true,
            runValidators: true,
          }
        );

      if (!updatedItem) {
        return res.status(404).json({
          success: false,
          message:
            "Menu item not found.",
        });
      }

      res.json({
        success: true,
        message:
          "Menu item updated successfully.",
        data: updatedItem,
      });

    } catch (error) {
      console.error(
        "❌ Update Menu Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Server error while updating menu item.",
      });
    }
  }
);

// ==================================================
// DELETE MENU ITEM
// ==================================================

app.delete(
  "/api/menu/:id",
  verifyAdmin,
  async (req, res) => {
    try {
      console.log(
        "🔥 DELETE MENU ROUTE HIT"
      );

      console.log(
        "Menu ID:",
        req.params.id
      );

      const deletedItem =
        await Menu.findByIdAndDelete(
          req.params.id
        );

      if (!deletedItem) {
        return res.status(404).json({
          success: false,
          message:
            "Menu item not found.",
        });
      }

      res.json({
        success: true,
        message:
          "Menu item deleted successfully.",
      });

    } catch (error) {
      console.error(
        "❌ Delete Menu Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Server error while deleting menu item.",
      });
    }
  }
);

// ==================================================
// CREATE ORDER API
// ==================================================

app.post(
  "/api/orders",
  async (req, res) => {
    try {
      console.log(
        "🛒 CREATE ORDER ROUTE HIT"
      );

      const {
        orderId,
        customerName,
        customerEmail,
        customerPhone,
        address,
        city,
        pincode,
        paymentMethod,
        items,
        total,
        orderDate,
      } = req.body;

      // VALIDATION

      if (
        !orderId ||
        !customerName ||
        !customerEmail ||
        !customerPhone ||
        !address ||
        !city ||
        !pincode ||
        !paymentMethod ||
        !Array.isArray(items) ||
        items.length === 0 ||
        total === undefined
      ) {
        return res.status(400).json({
          success: false,
          message:
            "All order details are required.",
        });
      }

      // CREATE ORDER

      const newOrder = new Order({
        orderId: orderId.trim(),

        customerName:
          customerName.trim(),

        customerEmail:
          customerEmail
            .toLowerCase()
            .trim(),

        customerPhone:
          customerPhone.trim(),

        address:
          address.trim(),

        city:
          city.trim(),

        pincode:
          pincode.trim(),

        paymentMethod,

        items,

        total,

        orderDate:
          orderDate || new Date(),

        status: "Placed",
      });

      // SAVE ORDER

      await newOrder.save();

      console.log(
        "✅ Order saved to MongoDB:",
        newOrder.orderId
      );

      // RESPONSE

      res.status(201).json({
        success: true,
        message:
          "Order placed successfully.",
        order: newOrder,
      });

    } catch (error) {
      console.error(
        "❌ Create Order Error:",
        error
      );

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message:
            "Order ID already exists.",
        });
      }

      res.status(500).json({
        success: false,
        message:
          "Server error while creating order.",
      });
    }
  }
);

// ==================================================
// GET CUSTOMER ORDERS API
// ==================================================

app.get(
  "/api/orders/customer/:email",
  async (req, res) => {
    try {
      console.log(
        "📦 GET CUSTOMER ORDERS ROUTE HIT"
      );

      const customerEmail =
        decodeURIComponent(
          req.params.email
        )
          .toLowerCase()
          .trim();

      // VALIDATE EMAIL

      if (!customerEmail) {
        return res.status(400).json({
          success: false,
          message:
            "Customer email is required.",
        });
      }

      // FIND CUSTOMER ORDERS

      const orders =
        await Order.find({
          customerEmail:
            customerEmail,
        }).sort({
          orderDate: -1,
        });

      console.log(
        `✅ ${orders.length} order(s) found for: ${customerEmail}`
      );

      // RESPONSE

      res.json({
        success: true,
        orders: orders,
      });

    } catch (error) {
      console.error(
        "❌ Get Customer Orders Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Server error while fetching orders.",
      });
    }
  }
);

// ==================================================
// ADMIN ORDER APIs
// ==================================================

// ==================================================
// GET ALL ORDERS - ADMIN
// ==================================================

app.get(
  "/api/orders",
  verifyAdmin,
  async (req, res) => {
    try {
      console.log(
        "📋 ADMIN GET ALL ORDERS ROUTE HIT"
      );

      const orders =
        await Order.find().sort({
          orderDate: -1,
        });

      console.log(
        `✅ ${orders.length} order(s) found for admin.`
      );

      res.json({
        success: true,
        orders: orders,
      });

    } catch (error) {
      console.error(
        "❌ Admin Get Orders Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Server error while fetching orders.",
      });
    }
  }
);

// ==================================================
// UPDATE ORDER STATUS - ADMIN
// ==================================================

app.put(
  "/api/orders/:id/status",
  verifyAdmin,
  async (req, res) => {
    try {
      console.log(
        "🔄 UPDATE ORDER STATUS ROUTE HIT"
      );

      console.log(
        "Order ID:",
        req.params.id
      );

      const { status } = req.body;

      // VALID STATUSES

      const validStatuses = [
        "Placed",
        "Confirmed",
        "Preparing",
        "Out for Delivery",
        "Delivered",
        "Cancelled",
      ];

      // VALIDATE STATUS

      if (!status) {
        return res.status(400).json({
          success: false,
          message:
            "Order status is required.",
        });
      }

      if (
        !validStatuses.includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order status.",
        });
      }

      // FIND AND UPDATE ORDER

      const updatedOrder =
        await Order.findByIdAndUpdate(
          req.params.id,
          {
            status: status,
          },
          {
            new: true,
            runValidators: true,
          }
        );

      // ORDER NOT FOUND

      if (!updatedOrder) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found.",
        });
      }

      console.log(
        "✅ Order status updated:",
        updatedOrder.orderId,
        "→",
        updatedOrder.status
      );

      // RESPONSE

      res.json({
        success: true,
        message:
          "Order status updated successfully.",
        order: updatedOrder,
      });

    } catch (error) {
      console.error(
        "❌ Update Order Status Error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Server error while updating order status.",
      });
    }
  }
);

// ==================================================
// REGISTERED ROUTES CHECK
// ==================================================

console.log(
  "========== REGISTERED ROUTES =========="
);

const router =
  app.router || app._router;

if (
  router &&
  router.stack
) {
  router.stack.forEach(
    (layer) => {
      if (layer.route) {
        console.log(
          layer.route.path,
          Object.keys(
            layer.route.methods
          )
        );
      }
    }
  );
} else {
  console.log(
    "❌ Express router not found"
  );
}

console.log(
  "======================================="
);

// ==================================================
// START SERVER
// ==================================================

if (!process.env.MONGO_URI) {
  console.error(
    "❌ Server cannot start because MONGO_URI is missing."
  );
} else {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log(
        "✅ MongoDB Connected"
      );

      app.listen(
        PORT,
        "0.0.0.0",
        () => {
          console.log(
            `🚀 Server Running on port ${PORT}`
          );

          console.log(
            `🌐 Health Check: http://localhost:${PORT}/`
          );
        }
      );
    })
    .catch((err) => {
      console.error(
        "❌ MongoDB Error:",
        err.message
      );
    });
}