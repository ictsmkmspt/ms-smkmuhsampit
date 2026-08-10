<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BkCase extends Model
{
    protected $table = 'bk_cases';

    protected $fillable = ['student_id', 'sanksi_kejadian_id', 'tahun_ajaran_id', 'dicatat_oleh', 'tanggal', 'kategori', 'catatan', 'tindak_lanjut', 'status'];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function sanksiKejadian()
    {
        return $this->belongsTo(SanksiKejadian::class);
    }

    public function tahunAjaran()
    {
        return $this->belongsTo(TahunAjaran::class);
    }

    public function pencatat()
    {
        return $this->belongsTo(User::class, 'dicatat_oleh');
    }
}
