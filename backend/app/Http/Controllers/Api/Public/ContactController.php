<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\ConsultationRequest;
use App\Models\Enquiry;
use App\Models\NewsletterSubscriber;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ContactController extends Controller
{
    public function contact(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'phone' => 'required|string|max:20',
            'email' => 'required|email|max:120',
            'service' => 'nullable|string|max:120',
            'message' => 'required|string|max:5000',
        ]);
        $enquiry = Enquiry::create($data);
        try {
            Mail::raw(
                "New enquiry from {$enquiry->name}\nPhone: {$enquiry->phone}\nEmail: {$enquiry->email}\nService: {$enquiry->service}\n\n{$enquiry->message}",
                function ($m) use ($enquiry) {
                    $m->to('abkhanassociates@gmail.com')->subject('New website enquiry #' . $enquiry->id);
                }
            );
        } catch (\Throwable $e) {
            Log::warning('Enquiry mail failed: '.$e->getMessage());
        }
        return response()->json(['message' => 'Thank you. We will contact you shortly.', 'id' => $enquiry->id], 201);
    }

    public function newsletter(Request $request)
    {
        $data = $request->validate(['email' => 'required|email|max:120']);
        NewsletterSubscriber::updateOrCreate(['email' => $data['email']], ['is_active' => true]);
        return response()->json(['message' => 'Subscribed successfully.']);
    }

    public function appointment(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'phone' => 'required|string|max:20',
            'email' => 'nullable|email',
            'service' => 'nullable|string|max:120',
            'preferred_at' => 'nullable|date',
            'notes' => 'nullable|string|max:2000',
        ]);
        $appt = Appointment::create($data);
        return response()->json(['message' => 'Appointment request received.', 'id' => $appt->id], 201);
    }

    public function consultation(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'phone' => 'required|string|max:20',
            'email' => 'nullable|email',
            'topic' => 'nullable|string|max:120',
            'message' => 'nullable|string|max:2000',
        ]);
        $c = ConsultationRequest::create($data);
        return response()->json(['message' => 'Consultation request received.', 'id' => $c->id], 201);
    }
}
