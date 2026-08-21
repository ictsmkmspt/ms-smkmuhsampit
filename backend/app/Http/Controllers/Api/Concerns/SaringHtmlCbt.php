<?php

namespace App\Http\Controllers\Api\Concerns;

use HTMLPurifier;
use HTMLPurifier_Config;

/**
 * Saring HTML dari editor TipTap sebelum disimpan — dipakai bareng
 * CbtQuestionController (soal/pilihan) & CbtMateriController (isi materi).
 * Pertahanan lapis kedua selain DOMPurify di frontend (sanitizeHtml.js):
 * frontend bisa dilewati dengan panggil API langsung, jadi backend TETAP
 * tidak boleh percaya begitu saja ke HTML yang dikirim. Daftar tag/atribut
 * yang diizinkan sengaja disamakan dengan sanitizeHtml.js.
 */
trait SaringHtmlCbt
{
    private function saringHtml(string $html): string
    {
        static $purifier = null;
        if ($purifier === null) {
            $config = HTMLPurifier_Config::createDefault();
            $config->set('HTML.Allowed', 'p,br,strong,em,u,s,sup,sub,ul,ol,li,blockquote,a[href],img[src|alt],table,tbody,thead,tr,td[colspan|rowspan],th[colspan|rowspan],span');
            $config->set('URI.AllowedSchemes', ['http' => true, 'https' => true, 'data' => true]);
            // Cache definisi HTMLPurifier butuh direktori writable yang
            // sudah ada — daripada gantung ke folder storage/ yang harus
            // dibuat manual tiap deploy (gitignored, tidak ikut ke-commit),
            // matikan saja cache-nya. Volume pemakaian kecil (1 sekolah),
            // overhead scan ulang tiap request bisa diabaikan.
            $config->set('Cache.DefinitionImpl', null);
            $purifier = new HTMLPurifier($config);
        }

        return $purifier->purify($html);
    }
}
