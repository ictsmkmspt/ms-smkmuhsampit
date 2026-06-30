<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        \App\Models\User::create([
            'name' => 'Administrator',
            'email' => 'admin@sekolah.com',
            'password' => bcrypt('admin123'),
            'role' => 'admin',
        ]);
    }
}
