<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'phone', 'password', 'role', 'room_id', 'iduka_id'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function student()
    {
        return $this->hasOne(Student::class);
    }

    public function teacher()
    {
        return $this->hasOne(Teacher::class);
    }

    /**
     * Perusahaan mitra (IDUKA) yang diwakili akun ini — dipakai akun
     * Instruktur (bimbingan/absensi/penilaian PKL) MAUPUN akun IDUKA.
     * SENGAJA belongsTo lewat users.iduka_id (BUKAN lagi hasOne lewat
     * idukas.user_id) — 1 perusahaan sekarang bisa diwakili lebih dari 1
     * akun (mis. beberapa Instruktur beda orang di perusahaan yang sama),
     * jadi kepemilikannya dibalik: akun MEMILIH perusahaan yang sudah ada,
     * bukan tiap akun mendirikan baris perusahaan sendiri-sendiri. Nama
     * method & pemakaiannya di controller PKL sengaja TIDAK berubah
     * ($user->iduka tetap berfungsi sama seperti sebelumnya).
     */
    public function iduka()
    {
        return $this->belongsTo(Iduka::class, 'iduka_id');
    }

    /**
     * Ruang yang jadi tanggung jawab akun ini, khusus role teknisi/kepala_bengkel.
     */
    public function room()
    {
        return $this->belongsTo(Room::class);
    }

    /**
     * Anak-anak (siswa) yang terhubung ke akun ini, khusus untuk user berperan "wali".
     */
    public function children()
    {
        return $this->belongsToMany(Student::class, 'parent_student', 'parent_id', 'student_id')
            ->withPivot('hubungan')
            ->withTimestamps();
    }

    /**
     * Notifikasi in-app milik akun ini. Sengaja method sendiri (bukan pakai
     * trait Notifiable bawaan Laravel yang cuma nyimpen type/data JSON) —
     * kolom title/body/url/category di tabel ini flat supaya gampang
     * di-query & dirender di frontend tanpa parsing.
     */
    public function notifications()
    {
        return $this->hasMany(Notification::class)->latest();
    }
}
