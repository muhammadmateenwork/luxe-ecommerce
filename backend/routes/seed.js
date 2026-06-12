import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Review from '../models/Review.js';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import Coupon from '../models/Coupon.js';
import Newsletter from '../models/Newsletter.js';
import CartItem from '../models/CartItem.js';
import WishlistItem from '../models/WishlistItem.js';
import RecentlyViewed from '../models/RecentlyViewed.js';

const router = Router();

router.post('/seed', async (req, res) => {
  try {
    // Clean all existing data
    await Promise.all([
      OrderItem.deleteMany({}), Order.deleteMany({}), CartItem.deleteMany({}),
      WishlistItem.deleteMany({}), RecentlyViewed.deleteMany({}), Review.deleteMany({}),
      Product.deleteMany({}), Category.deleteMany({}), Newsletter.deleteMany({}),
      Coupon.deleteMany({}), User.deleteMany({}),
    ]);

    // Create Categories
    const menCategory = await Category.create({ name: 'Men', slug: 'men', description: "Men's clothing and accessories" });
    const womenCategory = await Category.create({ name: 'Women', slug: 'women', description: "Women's clothing and accessories" });
    const kidsCategory = await Category.create({ name: 'Kids', slug: 'kids', description: "Kids' clothing and accessories" });
    const shoesCategory = await Category.create({ name: 'Shoes', slug: 'shoes', description: 'Footwear for all' });
    const accessoriesCategory = await Category.create({ name: 'Accessories', slug: 'accessories', description: 'Fashion accessories' });

    // Create Admin User
    const adminPassword = await bcrypt.hash('admin123', 12);
    const admin = await User.create({
      email: 'admin@example.com', name: 'Admin User', password: adminPassword, role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80',
    });

    // Create Users
    const userNames = [
      'John Smith', 'Emma Wilson', 'Michael Brown', 'Sarah Davis', 'James Johnson',
      'Olivia Martinez', 'William Anderson', 'Sophia Taylor', 'Benjamin Thomas', 'Isabella Garcia',
      'Lucas Rodriguez', 'Mia Lopez', 'Henry Lee', 'Charlotte Harris', 'Alexander Clark',
      'Amelia Lewis', 'Daniel Walker', 'Harper Hall', 'Matthew Allen', 'Evelyn Young',
    ];
    const users = [];
    for (let i = 0; i < userNames.length; i++) {
      const password = await bcrypt.hash('password123', 12);
      const user = await User.create({
        email: `user${i + 1}@example.com`, name: userNames[i], password,
        avatar: `https://i.pravatar.cc/150?u=${i + 1}`,
      });
      users.push(user);
    }

    // Create Products
    const menProducts = [
      { name: 'Classic Oxford Shirt', brand: 'Heritage', price: 89.99, salePrice: 69.99, sizes: ['S', 'M', 'L', 'XL'], colors: ['White', 'Blue', 'Pink'], images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80', 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&q=80'], stock: 150, isFeatured: true, isBestSeller: true },
      { name: 'Slim Fit Blazer', brand: 'Modern Tailor', price: 199.99, salePrice: null, sizes: ['S', 'M', 'L', 'XL', 'XXL'], colors: ['Navy', 'Charcoal', 'Black'], images: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80', 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&q=80'], stock: 80, isFeatured: true, isNewArrival: true },
      { name: 'Casual Polo T-Shirt', brand: 'Urban Style', price: 45.00, salePrice: 35.00, sizes: ['S', 'M', 'L', 'XL'], colors: ['White', 'Black', 'Red'], images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80'], stock: 200, isBestSeller: true, isTrending: true },
      { name: 'Denim Jacket', brand: 'Rugged Wear', price: 129.99, salePrice: 99.99, sizes: ['S', 'M', 'L', 'XL'], colors: ['Blue', 'Black', 'Light Wash'], images: ['https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=800&q=80', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80'], stock: 60, isTrending: true },
      { name: 'Formal Dress Pants', brand: 'Executive', price: 79.99, salePrice: null, sizes: ['28', '30', '32', '34', '36'], colors: ['Black', 'Navy', 'Gray'], images: ['https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&q=80', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80'], stock: 120, isFeatured: true },
      { name: 'Graphic Print Hoodie', brand: 'Street King', price: 69.99, salePrice: 54.99, sizes: ['S', 'M', 'L', 'XL', 'XXL'], colors: ['Black', 'Gray', 'Navy'], images: ['https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&q=80', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80', 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=800&q=80'], stock: 180, isFlashSale: true, flashSaleEnds: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
      { name: 'Linen Summer Shirt', brand: 'Coastal Breeze', price: 59.99, salePrice: 44.99, sizes: ['S', 'M', 'L', 'XL'], colors: ['White', 'Sky Blue', 'Beige'], images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80'], stock: 90, isNewArrival: true },
      { name: 'Cashmere Sweater', brand: 'Luxe Knit', price: 159.99, salePrice: null, sizes: ['S', 'M', 'L', 'XL'], colors: ['Camel', 'Black', 'Burgundy'], images: ['https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&q=80', 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=800&q=80'], stock: 45, isFeatured: true, isNewArrival: true },
      { name: 'Chino Shorts', brand: 'Weekend Warrior', price: 49.99, salePrice: 39.99, sizes: ['28', '30', '32', '34', '36'], colors: ['Khaki', 'Navy', 'Olive'], images: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80', 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&q=80'], stock: 160, isBestSeller: true },
      { name: 'Wool Overcoat', brand: 'Heritage', price: 299.99, salePrice: 249.99, sizes: ['S', 'M', 'L', 'XL'], colors: ['Camel', 'Black', 'Gray'], images: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80', 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=800&q=80'], stock: 35, isTrending: true, isFeatured: true },
      { name: 'V-Neck T-Shirt Pack', brand: 'Essential', price: 35.00, salePrice: 28.00, sizes: ['S', 'M', 'L', 'XL', 'XXL'], colors: ['White', 'Black', 'Gray'], images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80'], stock: 300, isBestSeller: true },
    ];

    const womenProducts = [
      { name: 'Silk Wrap Dress', brand: 'Elegance', price: 159.99, salePrice: 119.99, sizes: ['XS', 'S', 'M', 'L'], colors: ['Floral', 'Black', 'Burgundy'], images: ['https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&q=80', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80'], stock: 70, isFeatured: true, isBestSeller: true },
      { name: 'High-Waist Skinny Jeans', brand: 'Curve', price: 79.99, salePrice: null, sizes: ['24', '26', '28', '30', '32'], colors: ['Dark Blue', 'Black', 'Light Wash'], images: ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80', 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80'], stock: 150, isTrending: true },
      { name: 'Blouse with Ruffle Details', brand: 'Feminine Touch', price: 69.99, salePrice: 54.99, sizes: ['XS', 'S', 'M', 'L', 'XL'], colors: ['White', 'Pink', 'Navy'], images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&q=80'], stock: 110, isNewArrival: true },
      { name: 'Cashmere Cardigan', brand: 'Luxe Knit', price: 189.99, salePrice: 149.99, sizes: ['S', 'M', 'L'], colors: ['Cream', 'Blush', 'Gray'], images: ['https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80'], stock: 55, isFeatured: true },
      { name: 'A-Line Midi Skirt', brand: 'Vintage Rose', price: 69.99, salePrice: null, sizes: ['XS', 'S', 'M', 'L'], colors: ['Black', 'Navy', 'Forest Green'], images: ['https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=800&q=80', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&q=80'], stock: 85, isBestSeller: true },
      { name: 'Tailored Blazer', brand: 'Power Suite', price: 179.99, salePrice: 139.99, sizes: ['XS', 'S', 'M', 'L', 'XL'], colors: ['Black', 'Navy', 'Camel'], images: ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80', 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80'], stock: 65, isNewArrival: true, isTrending: true },
      { name: 'Floral Maxi Dress', brand: 'Garden Party', price: 129.99, salePrice: 99.99, sizes: ['XS', 'S', 'M', 'L'], colors: ['Floral Print', 'Blue Floral', 'Pink Floral'], images: ['https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80', 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=800&q=80'], stock: 75, isFlashSale: true, flashSaleEnds: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
      { name: 'Cropped Denim Jacket', brand: 'Urban Chic', price: 99.99, salePrice: null, sizes: ['XS', 'S', 'M', 'L'], colors: ['Blue', 'White', 'Black'], images: ['https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&q=80', 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80'], stock: 95, isBestSeller: true },
      { name: 'Satin Camisole Top', brand: 'Night & Day', price: 45.00, salePrice: 35.00, sizes: ['XS', 'S', 'M', 'L'], colors: ['Champagne', 'Black', 'Ivory'], images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80', 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&q=80'], stock: 130, isTrending: true },
      { name: 'Wide-Leg Palazzo Pants', brand: 'Seventies Revival', price: 89.99, salePrice: 69.99, sizes: ['XS', 'S', 'M', 'L', 'XL'], colors: ['Black', 'White', 'Tan'], images: ['https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=800&q=80', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&q=80'], stock: 80, isFeatured: true, isNewArrival: true },
      { name: 'Turtleneck Sweater', brand: 'Cozy Knits', price: 75.00, salePrice: 59.00, sizes: ['S', 'M', 'L', 'XL'], colors: ['Cream', 'Olive', 'Wine'], images: ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80'], stock: 100, isBestSeller: true },
    ];

    const kidsProducts = [
      { name: 'Fun Print T-Shirt', brand: 'Little Stars', price: 24.99, salePrice: 19.99, sizes: ['2T', '3T', '4T', '5T'], colors: ['Red', 'Blue', 'Yellow'], images: ['https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=800&q=80', 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&q=80'], stock: 200, isFeatured: true },
      { name: 'Denim Overalls', brand: 'Playtime', price: 39.99, salePrice: null, sizes: ['2T', '3T', '4T', '5T', '6'], colors: ['Blue', 'Light Wash'], images: ['https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&q=80', 'https://images.unsplash.com/photo-1471286314838-497ccaa7639d?w=800&q=80'], stock: 120, isBestSeller: true },
      { name: 'Rainbow Hoodie', brand: 'Happy Kids', price: 34.99, salePrice: 27.99, sizes: ['4', '5', '6', '7', '8'], colors: ['Rainbow', 'Pink', 'Blue'], images: ['https://images.unsplash.com/photo-1471286314838-497ccaa7639d?w=800&q=80', 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=800&q=80'], stock: 150, isNewArrival: true, isTrending: true },
      { name: 'Summer Shorts Set', brand: 'Sunny Days', price: 29.99, salePrice: 22.99, sizes: ['2T', '3T', '4T', '5T'], colors: ['Green', 'Orange', 'Blue'], images: ['https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=800&q=80', 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&q=80', 'https://images.unsplash.com/photo-1471286314838-497ccaa7639d?w=800&q=80'], stock: 180, isFlashSale: true, flashSaleEnds: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
      { name: 'Cozy Pajama Set', brand: 'Dreamland', price: 32.99, salePrice: null, sizes: ['2T', '3T', '4T', '5T', '6'], colors: ['Stars', 'Dinosaurs', 'Unicorns'], images: ['https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&q=80', 'https://images.unsplash.com/photo-1471286314838-497ccaa7639d?w=800&q=80'], stock: 100, isFeatured: true },
      { name: 'Athletic Joggers', brand: 'Active Kids', price: 27.99, salePrice: 21.99, sizes: ['4', '5', '6', '7', '8'], colors: ['Black', 'Navy', 'Gray'], images: ['https://images.unsplash.com/photo-1471286314838-497ccaa7639d?w=800&q=80', 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=800&q=80'], stock: 140, isBestSeller: true },
    ];

    const shoesProducts = [
      { name: 'Classic Running Shoes', brand: 'SprintPro', price: 119.99, salePrice: 89.99, sizes: ['7', '8', '9', '10', '11', '12'], colors: ['Black/White', 'Navy/Red', 'Gray/Green'], images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80', 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&q=80'], stock: 200, isFeatured: true, isBestSeller: true, isTrending: true },
      { name: 'Leather Chelsea Boots', brand: 'Heritage', price: 179.99, salePrice: null, sizes: ['7', '8', '9', '10', '11', '12'], colors: ['Brown', 'Black', 'Tan'], images: ['https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80', 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80'], stock: 80, isFeatured: true },
      { name: 'White Sneakers', brand: 'Clean Kicks', price: 89.99, salePrice: 69.99, sizes: ['6', '7', '8', '9', '10', '11'], colors: ['White', 'Off-White', 'White/Gum'], images: ['https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&q=80', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80'], stock: 250, isBestSeller: true },
      { name: 'Hiking Trail Boots', brand: 'Mountain Peak', price: 149.99, salePrice: 119.99, sizes: ['7', '8', '9', '10', '11', '12'], colors: ['Olive/Tan', 'Black/Gray', 'Brown'], images: ['https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80'], stock: 60, isNewArrival: true },
      { name: 'Slip-On Loafers', brand: 'Comfort Plus', price: 79.99, salePrice: null, sizes: ['7', '8', '9', '10', '11'], colors: ['Navy', 'Brown', 'Black'], images: ['https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80', 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&q=80', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80'], stock: 130, isTrending: true },
      { name: 'Basketball High-Tops', brand: 'Court King', price: 139.99, salePrice: 109.99, sizes: ['8', '9', '10', '11', '12', '13'], colors: ['Red/Black', 'Blue/White', 'Black/Gold'], images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80', 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80'], stock: 90, isFlashSale: true, flashSaleEnds: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000) },
      { name: 'Canvas Slip-Ons', brand: 'Beach Life', price: 49.99, salePrice: 39.99, sizes: ['6', '7', '8', '9', '10', '11'], colors: ['Navy', 'Red', 'Black', 'White'], images: ['https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&q=80', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80'], stock: 180, isBestSeller: true },
      { name: 'Formal Oxford Shoes', brand: 'Gentleman', price: 199.99, salePrice: null, sizes: ['7', '8', '9', '10', '11', '12'], colors: ['Black', 'Brown', 'Oxblood'], images: ['https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80'], stock: 50, isFeatured: true, isNewArrival: true },
    ];

    const accessoriesProducts = [
      { name: 'Leather Crossbody Bag', brand: 'Artisan', price: 89.99, salePrice: 69.99, sizes: ['One Size'], colors: ['Brown', 'Black', 'Tan'], images: ['https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80', 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80'], stock: 100, isFeatured: true, isBestSeller: true },
      { name: 'Aviator Sunglasses', brand: 'Shade Master', price: 149.99, salePrice: null, sizes: ['One Size'], colors: ['Gold/Green', 'Silver/Blue', 'Black/Gray'], images: ['https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80', 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80'], stock: 120, isTrending: true },
      { name: 'Minimalist Watch', brand: 'Timeless', price: 199.99, salePrice: 159.99, sizes: ['One Size'], colors: ['Silver/White', 'Gold/Black', 'Rose Gold/Pink'], images: ['https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80'], stock: 70, isFeatured: true, isNewArrival: true },
      { name: 'Wool Scarf', brand: 'Winter Luxe', price: 49.99, salePrice: 39.99, sizes: ['One Size'], colors: ['Camel', 'Charcoal', 'Burgundy', 'Forest Green'], images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80', 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80'], stock: 150, isBestSeller: true },
      { name: 'Leather Belt', brand: 'Heritage', price: 59.99, salePrice: null, sizes: ['S', 'M', 'L', 'XL'], colors: ['Brown', 'Black', 'Tan'], images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80', 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80', 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80'], stock: 200, isFlashSale: true, flashSaleEnds: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000) },
      { name: 'Silk Tie Set', brand: 'Gentleman', price: 45.00, salePrice: 35.00, sizes: ['One Size'], colors: ['Navy', 'Burgundy', 'Gray', 'Striped'], images: ['https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80'], stock: 90, isNewArrival: true },
      { name: 'Canvas Tote Bag', brand: 'Eco Chic', price: 34.99, salePrice: 27.99, sizes: ['One Size'], colors: ['Natural', 'Black', 'Olive'], images: ['https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80', 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80'], stock: 180, isBestSeller: true, isTrending: true },
      { name: 'Diamond Stud Earrings', brand: 'Sparkle', price: 299.99, salePrice: 249.99, sizes: ['One Size'], colors: ['Silver', 'Gold', 'Rose Gold'], images: ['https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80'], stock: 40, isFeatured: true },
    ];

    const allProductData = [
      ...menProducts.map(p => ({ ...p, categoryId: menCategory._id, category: 'Men' })),
      ...womenProducts.map(p => ({ ...p, categoryId: womenCategory._id, category: 'Women' })),
      ...kidsProducts.map(p => ({ ...p, categoryId: kidsCategory._id, category: 'Kids' })),
      ...shoesProducts.map(p => ({ ...p, categoryId: shoesCategory._id, category: 'Shoes' })),
      ...accessoriesProducts.map(p => ({ ...p, categoryId: accessoriesCategory._id, category: 'Accessories' })),
    ];

    const products = [];
    for (const pData of allProductData) {
      const slug = pData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const sku = `${pData.brand.substring(0, 3).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const product = await Product.create({
        name: pData.name, slug, description: `${pData.name} by ${pData.brand}. Premium quality ${pData.category.toLowerCase()} fashion crafted with care. Perfect for any occasion, this piece combines style and comfort effortlessly.`,
        brand: pData.brand, price: pData.price, salePrice: pData.salePrice || undefined, sku,
        stock: pData.stock, sizes: pData.sizes, colors: pData.colors, images: pData.images,
        categoryId: pData.categoryId, category: pData.category,
        isFeatured: pData.isFeatured || false, isNewArrival: pData.isNewArrival || false,
        isBestSeller: pData.isBestSeller || false, isTrending: pData.isTrending || false,
        isFlashSale: pData.isFlashSale || false, flashSaleEnds: pData.flashSaleEnds || undefined,
      });
      products.push(product);
    }

    // Create Reviews
    const reviewTitles = ['Great quality!', 'Love it', 'Good value', 'Impressive', 'Would buy again', 'Perfect fit', 'Beautiful design', 'Comfortable', 'Exactly as described', 'Amazing quality', 'Stunning piece', 'Worth every penny'];
    const reviewComments = ['The quality is outstanding, exactly what I was looking for.', 'Really impressed with this purchase. The color is exactly as shown.', 'Good value for the price. Would definitely recommend.', 'This exceeded my expectations in every way.', "I've been wearing this for a month now and it still looks brand new.", 'Perfect for everyday wear. Comfortable and stylish.', 'Got so many compliments. Will definitely be buying more.', 'The fabric is soft and breathable. Great for layering.', 'Shipping was fast and the packaging was beautiful.', 'This is my third purchase from this brand and they never disappoint.'];

    let reviewCount = 0;
    const createdReviewPairs = new Set();
    for (let i = 0; i < 200 && reviewCount < 120; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const randomProduct = products[Math.floor(Math.random() * products.length)];
      const pairKey = `${randomUser._id}-${randomProduct._id}`;
      if (!createdReviewPairs.has(pairKey)) {
        createdReviewPairs.add(pairKey);
        const rating = Math.floor(Math.random() * 3) + 3;
        await Review.create({
          userId: randomUser._id, productId: randomProduct._id, rating,
          title: reviewTitles[Math.floor(Math.random() * reviewTitles.length)],
          comment: reviewComments[Math.floor(Math.random() * reviewComments.length)],
        });
        reviewCount++;
      }
    }

    // Update product ratings
    for (const product of products) {
      const reviews = await Review.find({ productId: product._id }).select('rating');
      if (reviews.length > 0) {
        const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        await Product.findByIdAndUpdate(product._id, { averageRating: Math.round(averageRating * 10) / 10, totalReviews: reviews.length });
      }
    }

    // Create Orders
    const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    let orderCount = 0;
    for (let i = 0; i < 50 && orderCount < 35; i++) {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const numItems = Math.floor(Math.random() * 3) + 1;
      const orderProducts = [];
      const usedProductIds = new Set();
      for (let j = 0; j < numItems; j++) {
        const randomProduct = products[Math.floor(Math.random() * products.length)];
        if (!usedProductIds.has(randomProduct._id.toString())) {
          usedProductIds.add(randomProduct._id.toString());
          orderProducts.push({
            product: randomProduct,
            quantity: Math.floor(Math.random() * 3) + 1,
            size: randomProduct.sizes[Math.floor(Math.random() * randomProduct.sizes.length)] || null,
            color: randomProduct.colors[Math.floor(Math.random() * randomProduct.colors.length)] || null,
          });
        }
      }
      if (orderProducts.length === 0) continue;

      let subtotal = 0;
      const orderItemsData = orderProducts.map(item => {
        const price = item.product.salePrice || item.product.price;
        subtotal += price * item.quantity;
        return { productId: item.product._id, name: item.product.name, image: item.product.images[0] || '', price, quantity: item.quantity, size: item.size, color: item.color };
      });

      const shippingCost = subtotal > 100 ? 0 : 10;
      const total = subtotal + shippingCost;
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const shippingAddress = { firstName: randomUser.name.split(' ')[0], lastName: randomUser.name.split(' ')[1] || '', street: `${Math.floor(Math.random() * 9999) + 1} Main Street`, city: 'New York', state: 'NY', zipCode: '10001', country: 'US' };

      const order = await Order.create({
        userId: randomUser._id, orderNumber, status, subtotal, shippingCost, discount: 0, total,
        shippingAddress, paymentMethod: Math.random() > 0.5 ? 'cod' : 'stripe',
        deliveredAt: status === 'delivered' ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : undefined,
        cancelledAt: status === 'cancelled' ? new Date() : undefined,
        createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
      });

      for (const itemData of orderItemsData) {
        await OrderItem.create({ orderId: order._id, ...itemData });
      }
      orderCount++;
    }

    // Create Coupons
    await Coupon.create([
      { code: 'WELCOME10', discount: 10, discountType: 'percentage', minPurchase: 50, maxDiscount: 50, usageLimit: 100, isActive: true, expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
      { code: 'SUMMER25', discount: 25, discountType: 'percentage', minPurchase: 100, maxDiscount: 100, usageLimit: 50, isActive: true, expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) },
      { code: 'FLAT20', discount: 20, discountType: 'fixed', minPurchase: 100, usageLimit: 200, isActive: true, expiresAt: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000) },
      { code: 'FIRSTORDER', discount: 15, discountType: 'percentage', maxDiscount: 75, usageLimit: 500, isActive: true, expiresAt: undefined },
      { code: 'VIP50', discount: 50, discountType: 'fixed', minPurchase: 200, usageLimit: 10, isActive: true, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      { code: 'EXPIRED10', discount: 10, discountType: 'percentage', isActive: false, expiresAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
    ]);

    res.json({
      success: true, message: 'Database seeded successfully',
      data: { categories: 5, products: products.length, users: users.length + 1, reviews: reviewCount, orders: orderCount, coupons: 6 },
    });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

export default router;
