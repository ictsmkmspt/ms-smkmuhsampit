<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Spp extends Model
{
    protected $fillable = [
        'student_id', 'bulan', 'tahun', 'nominal', 'jumlah_dibayar', 'status', 'tanggal_bayar', 'dicatat_oleh',
    ];

    protected $casts = [
        'tanggal_bayar' => 'date:Y-m-d',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function dicatatOleh()
    {
        return $this->belongsTo(User::class, 'dicatat_oleh');
    }

    /**
     * Buat tagihan SPP 1 bulan untuk semua siswa yang belum punya catatan di
     * bulan itu, pakai nominal default dari pengaturan. Dipakai bareng oleh
     * SppController (generate manual oleh TU) dan command terjadwal (otomatis
     * tanggal 1). Mengembalikan jumlah siswa yang baru dibuatkan tagihan.
     */
    public static function generateBulanan(int $bulan, int $tahun): int
    {
        $nominalDefault = (int) Setting::get('spp_nominal_default', '0');

        $existingStudentIds = static::where('bulan', $bulan)->where('tahun', $tahun)->pluck('student_id');
        $students = Student::where('status', 'aktif')->whereNotIn('id', $existingStudentIds)->get();

        foreach ($students as $student) {
            static::create([
                'student_id' => $student->id,
                'bulan' => $bulan,
                'tahun' => $tahun,
                'nominal' => $nominalDefault,
                'status' => 'belum_bayar',
            ]);
        }

        return $students->count();
    }
}
