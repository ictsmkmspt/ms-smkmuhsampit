<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Procurement extends Model
{
    protected $fillable = ['nama_barang', 'jumlah', 'alasan', 'status', 'tanggal_pengajuan', 'tanggal_realisasi', 'keterangan'];
}
