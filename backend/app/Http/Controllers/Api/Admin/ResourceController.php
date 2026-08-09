<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Appointment;
use App\Models\Article;
use App\Models\Category;
use App\Models\ClientDocument;
use App\Models\ClientProfile;
use App\Models\ComplianceTask;
use App\Models\ConsultationRequest;
use App\Models\DueDate;
use App\Models\Enquiry;
use App\Models\Faq;
use App\Models\NewsletterSubscriber;
use App\Models\TdsTcsSection;
use App\Models\Testimonial;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ResourceController extends Controller
{
    private array $map = [
        'enquiries' => Enquiry::class,
        'appointments' => Appointment::class,
        'consultations' => ConsultationRequest::class,
        'newsletter' => NewsletterSubscriber::class,
        'categories' => Category::class,
        'articles' => Article::class,
        'due-dates' => DueDate::class,
        'testimonials' => Testimonial::class,
        'faqs' => Faq::class,
        'compliance' => ComplianceTask::class,
        'client-documents' => ClientDocument::class,
        'tds-tcs-sections' => TdsTcsSection::class,
    ];

    public function index(string $resource)
    {
        $model = $this->resolve($resource);
        $q = $model::query()->latest();
        if ($resource === 'articles') $q->with('category');
        if ($resource === 'compliance') $q->with(['clientProfile', 'assignee:id,name']);
        return response()->json($q->paginate(25));
    }

    public function store(Request $request, string $resource)
    {
        $model = $this->resolve($resource);
        $data = $request->all();
        if ($resource === 'articles' && empty($data['slug']) && !empty($data['title'])) {
            $data['slug'] = Str::slug($data['title']);
        }
        if ($resource === 'categories' && empty($data['slug']) && !empty($data['name'])) {
            $data['slug'] = Str::slug($data['name']);
        }
        $item = $model::create($data);
        $this->log($request, "created_$resource", $item);
        return response()->json($item, 201);
    }

    public function show(string $resource, int $id)
    {
        return response()->json($this->resolve($resource)::findOrFail($id));
    }

    public function update(Request $request, string $resource, int $id)
    {
        $item = $this->resolve($resource)::findOrFail($id);
        $item->update($request->all());
        $this->log($request, "updated_$resource", $item);
        return response()->json($item);
    }

    public function destroy(Request $request, string $resource, int $id)
    {
        $item = $this->resolve($resource)::findOrFail($id);
        $item->delete();
        $this->log($request, "deleted_$resource", $item);
        return response()->json(['message' => 'Deleted']);
    }

    public function clients()
    {
        return response()->json(
            ClientProfile::with('user:id,name,email,phone,role,is_active')->latest()->paginate(25)
        );
    }

    public function storeClient(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'phone' => 'nullable|string',
            'business_name' => 'nullable|string',
            'gstin' => 'nullable|string',
            'pan' => 'nullable|string',
            'address' => 'nullable|string',
            'city' => 'nullable|string',
            'pincode' => 'nullable|string',
            'state_code' => 'nullable|string|max:2',
        ]);
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'phone' => $data['phone'] ?? null,
            'role' => 'client',
        ]);
        $profile = ClientProfile::create([
            'user_id' => $user->id,
            'business_name' => $data['business_name'] ?? $data['name'],
            'gstin' => $data['gstin'] ?? null,
            'pan' => $data['pan'] ?? null,
            'address' => $data['address'] ?? null,
            'city' => $data['city'] ?? null,
            'pincode' => $data['pincode'] ?? null,
            'state_code' => $data['state_code'] ?? '27',
        ]);
        $this->log($request, 'created_client', $profile);
        return response()->json($profile->load('user'), 201);
    }

    public function staff()
    {
        return response()->json(
            User::whereIn('role', ['super_admin', 'admin', 'staff'])->orderBy('name')->get()
        );
    }

    public function storeStaff(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'role' => 'required|in:admin,staff',
            'phone' => 'nullable|string',
        ]);
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => $data['role'],
            'phone' => $data['phone'] ?? null,
        ]);
        $this->log($request, 'created_staff', $user);
        return response()->json($user, 201);
    }

    public function activity(Request $request)
    {
        return response()->json(ActivityLog::with('user:id,name')->latest()->paginate(50));
    }

    private function resolve(string $resource): string
    {
        abort_unless(isset($this->map[$resource]), 404, 'Unknown resource');
        return $this->map[$resource];
    }

    private function log(Request $request, string $action, $subject): void
    {
        ActivityLog::create([
            'user_id' => $request->user()?->id,
            'action' => $action,
            'subject_type' => get_class($subject),
            'subject_id' => $subject->id ?? null,
            'ip_address' => $request->ip(),
        ]);
    }
}
