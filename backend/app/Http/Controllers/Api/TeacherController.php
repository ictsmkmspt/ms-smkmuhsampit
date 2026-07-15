<?php

namespace App\Http\Controllers\Api;

use App\Exports\TeacherTemplateExport;
use App\Http\Controllers\Controller;
use App\Imports\TeachersImport;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;

class TeacherController extends Controller
{
    public function index()
    {
        return Teacher::with('user')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:6',
            'nip' => 'required|string|unique:teachers,nip',
        ]);

        return DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => bcrypt($data['password']),
                'role' => 'guru',
            ]);

            return Teacher::create([
                'user_id' => $user->id,
                'nip' => $data['nip'],
            ])->load('user');
        });
    }

    public function destroy(Teacher $teacher)
    {
        $teacher->user->delete();
        return response()->json(['message' => 'Guru dihapus.']);
    }

    /**
     * Download file Excel (.xlsx) kosong berisi contoh format kolom untuk import data guru.
     * Isi datanya, lalu upload lewat fitur Import.
     */
    public function downloadTemplate()
    {
        return Excel::download(new TeacherTemplateExport, 'template_import_guru.xlsx');
    }

    /**
     * Import banyak guru sekaligus dari file Excel (.xlsx) yang diupload.
     * Format kolom harus sesuai template (nama, email, password, nip).
     * Baris yang gagal tidak menghentikan proses, cukup dilaporkan di akhir.
     */
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv',
        ]);

        $import = new TeachersImport;
        Excel::import($import, $request->file('file'));

        $gagal = [];
        foreach ($import->failures() as $failure) {
            $gagal[] = [
                'baris'  => $failure->row(),
                'kolom'  => $failure->attribute(),
                'alasan' => implode(' ', $failure->errors()),
            ];
        }

        return response()->json([
            'message'  => $import->successCount . ' guru berhasil diimport, ' . count($gagal) . ' baris gagal.',
            'berhasil' => $import->successCount,
            'gagal'    => $gagal,
        ]);
    }
}
