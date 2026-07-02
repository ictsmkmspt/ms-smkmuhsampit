<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ViolationType extends Model
{
    protected $fillable = ['name', 'poin', 'system_key'];

    public function violations()
    {
        return $this->hasMany(Violation::class);
    }

    public function isSystem(): bool
    {
        return !is_null($this->system_key);
    }
}
