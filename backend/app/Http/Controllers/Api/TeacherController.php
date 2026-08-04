<?php

namespace App\Http\Controllers\Api;

use App\Exports\TeacherTemplateExport;
use App\Http\Controllers\Api\Concerns\ResetsPasswordToDefault;
use App\Http\Controllers\Controller;
use App\Imports\TeachersImport;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Facades\Excel;

class TeacherController extends Controller
{
    use ResetsPasswordToDefault;

    public function index()
    {
        return Teacher::with('user')->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|unique:users,email',
            'password' => 'nullable|min:6',
            'nip' => 'required|string|unique:teachers,nip',
            'jenis_kelamin' => 'nullable|in:L,P',
        ]);

        return DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => bcrypt($data['password'] ?? '123456'),
                'role' => 'guru',
            ]);

            return Teacher::create([
                'user_id' => $user->id,
                'nip' => $data['nip'],
                'jenis_kelamin' => $data['jenis_kelamin'] ?? null,
            ])->load('user');
        });
    }

    public function update(Request $request, Teacher $teacher)
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:100',
            'jenis_kelamin' => 'nullable|in:L,P',
        ]);

        if (isset($data['name'])) {
            $teacher->user->update(['name' => $data['name']]);
        }
        $teacher->update($request->only('jenis_kelamin'));

        return $teacher->load('user');
    }

    public function destroy(Teacher $teacher)
    {
        $teacher->user->delete();
        return response()->json(['message' => 'Guru dihapus.']);
    }

    public function resetPassword(Teacher $teacher)
    {
        $this->resetToDefaultPassword($teacher->user);
        return response()->json(['message' => 'Password guru "' . $teacher->user->name . '" berhasil direset ke default (123456).']);
    }

    public function downloadTemplate()
    {
        return Excel::download(new TeacherTemplateExport, 'template_import_guru.xlsx');
    }

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
