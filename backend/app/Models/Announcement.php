<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Announcement extends Model
{
    protected $fillable = ['judul', 'isi', 'foto', 'foto_uploaded_at', 'dibuat_oleh'];

    protected $appends = ['foto_url'];

    public function dibuatOleh()
    {
        return $this->belongsTo(User::class, 'dibuat_oleh');
    }

    /**
     * URL relatif foto pengumuman (null kalau belum/tidak ada foto, atau
     * sudah dihapus otomatis oleh AnnouncementCleanupPhotos setelah 30
     * hari). Sengaja relatif, sama seperti Iduka::tanda_tangan_url.
     */
    public function getFotoUrlAttribute(): ?string
    {
        return $this->foto ? '/storage/' . $this->foto : null;
    }
}
