<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    protected $fillable = [
        'user_id', 'actor_nama', 'actor_role', 'aksi', 'model_type', 'model_id', 'model_label', 'perubahan',
    ];

    protected $casts = [
        'perubahan' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
