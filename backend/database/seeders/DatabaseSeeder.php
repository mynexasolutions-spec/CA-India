<?php

namespace Database\Seeders;

use App\Models\Article;
use App\Models\Category;
use App\Models\ClientProfile;
use App\Models\Customer;
use App\Models\DueDate;
use App\Models\Faq;
use App\Models\Product;
use App\Models\Testimonial;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(TdsTcsSectionSeeder::class);

        $admin = User::create([
            'name' => 'A B Khan',
            'email' => 'admin@abkhanassociates.com',
            'password' => Hash::make('Admin@2026'),
            'role' => 'super_admin',
            'phone' => '8286681960',
        ]);

        User::create([
            'name' => 'Staff Member',
            'email' => 'staff@abkhanassociates.com',
            'password' => Hash::make('Staff@2026'),
            'role' => 'staff',
            'phone' => '8286681960',
        ]);

        $clientUser = User::create([
            'name' => 'Demo Client',
            'email' => 'client@abkhanassociates.com',
            'password' => Hash::make('Client@2026'),
            'role' => 'client',
            'phone' => '9876543210',
        ]);

        $profile = ClientProfile::create([
            'user_id' => $clientUser->id,
            'business_name' => 'Demo Trading Pvt Ltd',
            'gstin' => '27AABCT1234D1Z5',
            'pan' => 'AABCT1234D',
            'state_code' => '27',
            'address' => 'Nerul Aakash Ganga CHS, Sector 23',
            'city' => 'Navi Mumbai',
            'pincode' => '400706',
            'invoice_prefix' => 'INV',
            'invoice_next_number' => 1,
            'terms_conditions' => 'Payment due within 7 days.',
        ]);

        // Also give admin a billing profile for demo
        ClientProfile::create([
            'user_id' => $admin->id,
            'business_name' => 'A B KHAN & ASSOCIATES',
            'gstin' => '27AAAAA0000A1Z5',
            'pan' => 'AAAAA0000A',
            'state_code' => '27',
            'address' => 'Nerul Aakash Ganga CHS, Sector 23, Navi Mumbai',
            'city' => 'Navi Mumbai',
            'pincode' => '400706',
            'invoice_prefix' => 'ABK',
            'invoice_next_number' => 1,
        ]);

        Customer::create([
            'client_profile_id' => $profile->id,
            'name' => 'Sample Buyer',
            'email' => 'buyer@example.com',
            'phone' => '9999999999',
            'gstin' => '27BBBCT5678E1Z0',
            'state_code' => '27',
            'billing_address' => 'Mumbai, Maharashtra',
        ]);

        Product::create([
            'client_profile_id' => $profile->id,
            'name' => 'Professional Services',
            'hsn_sac' => '998314',
            'gst_rate' => 18,
            'unit' => 'NOS',
            'sale_price' => 10000,
        ]);

        $cats = [
            ['name' => 'Income Tax', 'slug' => 'income-tax'],
            ['name' => 'GST', 'slug' => 'gst'],
            ['name' => 'Company Law', 'slug' => 'company-law'],
            ['name' => 'Compliance', 'slug' => 'compliance'],
        ];
        foreach ($cats as $i => $c) {
            Category::create([...$c, 'sort_order' => $i]);
        }

        $articles = [
            ['title' => 'Key Changes in Income Tax for FY 2025-26', 'category_id' => 1],
            ['title' => 'GSTR-1 and GSTR-3B Due Dates Explained', 'category_id' => 2],
            ['title' => 'Startup Incorporation Checklist for Founders', 'category_id' => 3],
            ['title' => 'TDS Compliance Tips for Mid-Sized Businesses', 'category_id' => 4],
            ['title' => 'How to Claim ITC Correctly Under GST', 'category_id' => 2],
        ];
        foreach ($articles as $a) {
            Article::create([
                'category_id' => $a['category_id'],
                'author_id' => $admin->id,
                'title' => $a['title'],
                'slug' => Str::slug($a['title']),
                'excerpt' => 'A practical overview for business owners and finance teams.',
                'body' => "<p>This article provides guidance from A B KHAN & ASSOCIATES on <strong>{$a['title']}</strong>.</p><p>Please consult our team for advice specific to your facts.</p>",
                'status' => 'published',
                'published_at' => now()->subDays(rand(1, 30)),
                'meta_title' => $a['title'] . ' | A B KHAN & ASSOCIATES',
                'meta_description' => 'Expert insights from Chartered Accountants in Navi Mumbai.',
            ]);
        }

        DueDate::insert([
            ['title' => 'GSTR-3B Filing', 'type' => 'gst', 'due_on' => now()->addDays(5)->toDateString(), 'description' => 'Monthly return', 'is_active' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['title' => 'TDS Payment', 'type' => 'tds', 'due_on' => now()->addDays(7)->toDateString(), 'description' => 'Monthly TDS deposit', 'is_active' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['title' => 'Advance Tax Q1', 'type' => 'it', 'due_on' => now()->addDays(20)->toDateString(), 'description' => 'Income tax advance', 'is_active' => 1, 'created_at' => now(), 'updated_at' => now()],
        ]);

        Testimonial::insert([
            ['name' => 'Rajesh Mehta', 'role' => 'Director', 'company' => 'Mehta Traders', 'content' => 'Professional, responsive, and thorough. Our GST and company compliance has never been smoother.', 'rating' => 5, 'avatar_initials' => 'RM', 'is_featured' => 1, 'sort_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Priya Shah', 'role' => 'Founder', 'company' => 'Nova Labs', 'content' => 'They guided us from incorporation through start-up filings. Highly recommend A B Khan & Associates.', 'rating' => 5, 'avatar_initials' => 'PS', 'is_featured' => 1, 'sort_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Imran Qureshi', 'role' => 'CFO', 'company' => 'GulfLink India', 'content' => 'Clear advice on cross-border and UAE-related structuring along with solid India compliance.', 'rating' => 5, 'avatar_initials' => 'IQ', 'is_featured' => 1, 'sort_order' => 3, 'created_at' => now(), 'updated_at' => now()],
        ]);

        Faq::insert([
            ['question' => 'Where is your office located?', 'answer' => 'We are based in Nerul, Navi Mumbai (Sector 23).', 'page' => 'home', 'sort_order' => 1, 'is_active' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['question' => 'Do you handle GST registration and returns?', 'answer' => 'Yes — registration, monthly/quarterly returns, and advisory.', 'page' => 'home', 'sort_order' => 2, 'is_active' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['question' => 'How do I access the Client Portal?', 'answer' => 'Use Client Login from the header. Credentials are issued after onboarding.', 'page' => 'home', 'sort_order' => 3, 'is_active' => 1, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }
}
