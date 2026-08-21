<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CbtExamAuditLog extends Model
{
    protected $fillable = [
        'exam_id', 'nama_ujian', 'aksi', 'user_id', 'actor_nama', 'actor_role', 'attempts_count_saat_itu',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
