<?php

namespace App\Http\Controllers\Api;

use App\Exports\WaliTemplateExport;
use App\Http\Controllers\Controller;
use App\Imports\WaliImport;
use App\Models\User;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class WaliController extends Controller
{
    public function index()
    {
        return User::where('role', 'wali')
            ->with(['children.user', 'children.classRoom'])
            ->get();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'     => 'required|string|max:100',
            'phone'    => 'required|string|max:20|unique:users,phone',
            'password' => 'required|min:6',
        ]);

        $user = User::create([
            'name'     => $data['name'],
            'phone'    => $data['phone'],
            'password' => bcrypt($data['password']),
            'role'     => 'wali',
        ]);

        return response()->json($user, 201);
    }

    public function link(Request $request, $parentId)
    {
        $data = $request->validate([
            'student_id' => 'required|exists:students,id',
            'hubungan'   => 'nullable|string|max:50',
        ]);

        $parent = User::where('role', 'wali')->findOrFail($parentId);

        $parent->children()->syncWithoutDetaching([
            $data['student_id'] => ['hubungan' => $data['hubungan'] ?? null],
        ]);

        return response()->json(['message' => 'Siswa berhasil dihubungkan ke akun wali ini.']);
    }

    public function unlink($parentId, $studentId)
    {
        $parent = User::where('role', 'wali')->findOrFail($parentId);
        $parent->children()->detach($studentId);

        return response()->json(['message' => 'Siswa dilepas dari akun wali ini.']);
    }

    public function destroy($id)
    {
        $parent = User::where('role', 'wali')->findOrFail($id);
        $parent->delete();

        return response()->json(['message' => 'Akun wali dihapus.']);
    }

    public function downloadTemplate()
    {
        return Excel::download(new WaliTemplateExport, 'template_import_wali.xlsx');
    }

    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv',
        ]);

        $import = new WaliImport;
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
            'message'  => $import->successCount . ' baris berhasil diproses, ' . count($gagal) . ' baris gagal.',
            'berhasil' => $import->successCount,
            'gagal'    => $gagal,
        ]);
    }
}
