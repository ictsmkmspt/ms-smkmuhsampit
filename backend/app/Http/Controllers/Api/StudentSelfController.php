<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class StudentSelfController extends Controller
{
    public function profile(Request $request)
    {
        $student = $request->user()->student()->with('classRoom')->first();
        return response()->json($student);
    }

    public function attendances(Request $request)
    {
        $student = $request->user()->student;
        $data = $student->attendances()->orderByDesc('date')->limit(30)->get();
        return response()->json($data);
    }
}
