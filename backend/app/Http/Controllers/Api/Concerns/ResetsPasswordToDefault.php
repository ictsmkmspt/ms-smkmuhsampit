<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\User;

trait ResetsPasswordToDefault
{
    /**
     * Reset password akun ke default "123456" — sama seperti password
     * default saat akun baru dibuat. Login berikutnya otomatis kena flag
     * must_change_password, jadi pemiliknya wajib ganti sendiri.
     */
    private function resetToDefaultPassword(User $user): void
    {
        $user->update(['password' => bcrypt('123456')]);
    }
}
