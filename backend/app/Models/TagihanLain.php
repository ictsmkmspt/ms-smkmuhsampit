<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TagihanLain extends Model
{
    protected $fillable = [
        'student_id', 'tahun_ajaran_id', 'nama_tagihan', 'nominal', 'jumlah_dibayar', 'status', 'tanggal_bayar', 'keterangan', 'dicatat_oleh',
    ];

    protected $casts = [
        'tanggal_bayar' => 'date:Y-m-d',
    ];

    /**
     * Otomatis tandai tahun ajaran yang sedang aktif kalau tidak diisi
     * manual — supaya semua controller yang bikin TagihanLain tidak perlu
     * diubah satu-satu (sama seperti Violation/AcademicScore, dst).
     */
    protected static function booted(): void
    {
        static::creating(function (TagihanLain $tagihanLain) {
            if (empty($tagihanLain->tahun_ajaran_id)) {
                $tagihanLain->tahun_ajaran_id = TahunAjaran::aktifId();
            }
        });
    }

    public function tahunAjaran()
    {
        return $this->belongsTo(TahunAjaran::class);
    }

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function dicatatOleh()
    {
        return $this->belongsTo(User::class, 'dicatat_oleh');
    }
}
